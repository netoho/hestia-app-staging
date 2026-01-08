import { useEffect } from 'react';

type PerformanceMetric = {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
};

type WebVitalsMetric = {
  id: string;
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
};

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly enabled: boolean;
  private slowThreshold = 1000; // 1s for slow renders/requests

  constructor() {
    this.enabled = typeof window !== 'undefined' && process.env.NODE_ENV !== 'production';
  }

  // Track page load metrics
  trackPageLoad(pageName: string) {
    if (!this.enabled || typeof window === 'undefined') return;

    if ('performance' in window) {
      const perfData = window.performance.timing;
      const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
      const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
      const renderTime = perfData.domComplete - perfData.domLoading;

      this.record('page_load', pageLoadTime, { page: pageName });
      this.record('dom_ready', domReadyTime, { page: pageName });
      this.record('render_time', renderTime, { page: pageName });
    }
  }

  // Track API response times
  async trackAPICall<T>(
    name: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    if (!this.enabled) return apiCall();

    const start = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - start;

      this.record('api_call', duration, { endpoint: name });

      if (duration > this.slowThreshold) {
        console.warn(`Slow API call: ${name} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.record('api_error', duration, { endpoint: name, error: String(error) });
      throw error;
    }
  }

  // Track component render times
  trackRender(componentName: string, duration: number) {
    if (!this.enabled) return;

    this.record('component_render', duration, { component: componentName });

    if (duration > this.slowThreshold / 10) { // 100ms threshold for renders
      console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
    }
  }

  // Record custom metric
  record(name: string, value: number, metadata?: Record<string, any>) {
    if (!this.enabled) return;

    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata,
    });

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  // Get metrics summary
  getSummary(metricName?: string) {
    const filtered = metricName
      ? this.metrics.filter((m) => m.name === metricName)
      : this.metrics;

    if (filtered.length === 0) return null;

    const values = filtered.map((m) => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      count: filtered.length,
      avg: Math.round(avg),
      min: Math.round(min),
      max: Math.round(max),
      total: Math.round(sum),
    };
  }

  // Track Web Vitals
  onWebVitals(metric: WebVitalsMetric) {
    if (!this.enabled) return;

    this.record(`web_vital_${metric.name}`, metric.value, {
      id: metric.id,
      rating: metric.rating,
    });

    // Log poor ratings
    if (metric.rating === 'poor') {
      console.warn(`Poor Web Vital: ${metric.name} = ${metric.value} (${metric.rating})`);
    }
  }

  // Get all metrics
  getMetrics() {
    return this.metrics;
  }

  // Clear metrics
  clear() {
    this.metrics = [];
  }

  // Log summary to console
  logSummary() {
    if (!this.enabled) return;

    const uniqueNames = [...new Set(this.metrics.map((m) => m.name))];

    console.group('Performance Summary');
    uniqueNames.forEach((name) => {
      const summary = this.getSummary(name);
      if (summary) {
        console.log(`${name}:`, summary);
      }
    });
    console.groupEnd();
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for tracking component render performance
export function useRenderTracking(componentName: string) {
  if (typeof window === 'undefined') return;

  const startTime = performance.now();

  return () => {
    const duration = performance.now() - startTime;
    performanceMonitor.trackRender(componentName, duration);
  };
}

// HOC for tracking component render
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
): React.ComponentType<P> {
  const name = componentName || Component.displayName || Component.name || 'Unknown';

  return function PerformanceTrackedComponent(props: P) {
    const trackRender = useRenderTracking(name);

    useEffect(() => {
      trackRender?.();
    });

    return <Component {...props} />;
  } as React.ComponentType<P>;
}

// Track fetch with automatic timing
export async function trackedFetch<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  return performanceMonitor.trackAPICall(url, async () => {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  });
}

// Export for Next.js reportWebVitals
export function reportWebVitals(metric: WebVitalsMetric) {
  performanceMonitor.onWebVitals(metric);
}
