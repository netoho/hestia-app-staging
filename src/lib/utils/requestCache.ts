type CacheEntry<T> = {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
};

type CacheConfig = {
  ttl?: number; // Time to live in ms (default 5 minutes)
  maxSize?: number; // Max cache entries (default 100)
};

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl || 5 * 60 * 1000, // 5 minutes
      maxSize: config.maxSize || 100,
    };
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > this.config.ttl;
  }

  private evictOldest() {
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  async fetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: { ttl?: number }
  ): Promise<T> {
    const cached = this.cache.get(key);

    // Return cached data if valid
    if (cached && !this.isExpired(cached)) {
      // If there's a pending promise, wait for it
      if (cached.promise) {
        return cached.promise;
      }
      return cached.data;
    }

    // Deduplicate concurrent requests
    const existingPromise = cached?.promise;
    if (existingPromise) {
      return existingPromise;
    }

    // Create new request
    const promise = fetcher();

    // Store promise for deduplication
    this.cache.set(key, {
      data: null as any,
      timestamp: Date.now(),
      promise,
    });

    try {
      const data = await promise;

      // Update cache with result
      this.evictOldest();
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      // Remove failed request from cache
      this.cache.delete(key);
      throw error;
    }
  }

  invalidate(pattern?: string | RegExp) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keys = Array.from(this.cache.keys());
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    keys.forEach((key) => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });
  }

  get(key: string) {
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached) && !cached.promise) {
      return cached.data;
    }
    return null;
  }

  set<T>(key: string, data: T, ttl?: number) {
    this.evictOldest();
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  has(key: string): boolean {
    const cached = this.cache.get(key);
    return !!(cached && !this.isExpired(cached));
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
export const requestCache = new RequestCache();

// Helper to create cache keys
export function createCacheKey(url: string, params?: Record<string, any>): string {
  const searchParams = params ? `?${new URLSearchParams(params).toString()}` : '';
  return `${url}${searchParams}`;
}

// Cached fetch wrapper
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit & { cacheKey?: string; ttl?: number }
): Promise<T> {
  const cacheKey = options?.cacheKey || createCacheKey(url);

  return requestCache.fetch(
    cacheKey,
    async () => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    { ttl: options?.ttl }
  );
}

// Invalidate cache on mutations
export function invalidateCache(pattern?: string | RegExp) {
  requestCache.invalidate(pattern);
}
