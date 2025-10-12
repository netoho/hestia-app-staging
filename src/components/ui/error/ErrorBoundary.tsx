'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      errorInfo,
    });

    // Log to error tracking service (e.g., Sentry) in production
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="container mx-auto p-6 max-w-2xl animate-in fade-in duration-300">
          <Card className="border-red-200 border-2">
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                {/* Icon */}
                <div className="bg-red-50 rounded-full p-6 inline-block">
                  <AlertTriangle className="h-16 w-16 text-red-600" />
                </div>

                {/* Title and Description */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Algo salió mal
                  </h2>
                  <p className="text-gray-600">
                    Se produjo un error inesperado en la aplicación.
                  </p>
                </div>

                {/* Error Details (Development only) */}
                {this.props.showDetails &&
                  process.env.NODE_ENV === 'development' &&
                  this.state.error && (
                    <Alert className="text-left">
                      <AlertDescription>
                        <div className="space-y-2">
                          <div className="font-mono text-xs">
                            <strong>Error:</strong> {this.state.error.message}
                          </div>
                          {this.state.errorInfo && (
                            <details className="text-xs">
                              <summary className="cursor-pointer hover:text-blue-600">
                                Ver stack trace
                              </summary>
                              <pre className="mt-2 overflow-auto p-2 bg-gray-50 rounded">
                                {this.state.errorInfo.componentStack}
                              </pre>
                            </details>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button
                    onClick={this.handleReset}
                    variant="default"
                    size="lg"
                    className="transition-all hover:scale-105"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Intentar de nuevo
                  </Button>

                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    size="lg"
                    className="transition-all hover:scale-105"
                  >
                    <Home className="mr-2 h-4 w-4" />
                    Ir al inicio
                  </Button>
                </div>

                {/* Contact Support */}
                <Alert className="mt-6">
                  <AlertDescription>
                    Si el problema persiste, contacta a soporte técnico.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
