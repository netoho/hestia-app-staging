'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import { useState } from 'react';
import superjson from 'superjson';
import { trpc } from '@/lib/trpc/client';

/**
 * Get base URL for tRPC endpoint
 */
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return '';
  }
  if (process.env.VERCEL_URL) {
    // Reference for vercel.com deployments
    return `https://${process.env.VERCEL_URL}`;
  }
  // Assume localhost
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

/**
 * Create tRPC client with configuration
 */
function createTRPCClient() {
  return trpc.createClient({
    links: [
      // Log in development
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === 'development' ||
          (opts.direction === 'down' && opts.result instanceof Error),
      }),
      // HTTP transport with transformer
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
        headers() {
          return {
            // Pass auth token if available
            authorization: typeof window !== 'undefined'
              ? localStorage.getItem('token') || ''
              : '',
          };
        },
      }),
    ],
  });
}

/**
 * Provider component that wraps the app
 */
export function TRPCProviders({ children }: { children: React.ReactNode }) {
  // Create query client with configuration
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // With tRPC, we don't need to worry about stale time as much
        staleTime: 1000 * 60 * 5, // 5 minutes
        // Keep cache for 10 minutes (gcTime is the new name for cacheTime)
        gcTime: 1000 * 60 * 10,
        // Retry failed requests
        retry: (failureCount, error: any) => {
          // Don't retry on 4xx errors
          if (error?.data?.code === 'UNAUTHORIZED' ||
              error?.data?.code === 'FORBIDDEN' ||
              error?.data?.code === 'NOT_FOUND') {
            return false;
          }
          // Retry up to 3 times
          return failureCount < 3;
        },
        // Refetch on window focus (configurable)
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Show error notifications on mutation failure
        onError: (error: any) => {
          // You can integrate with your toast library here
          console.error('Mutation error:', error);
        },
      },
    },
  }));

  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
