import { SWRConfiguration } from 'swr';

// Default fetcher for SWR
export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object
    (error as any).info = await res.json();
    (error as any).status = res.status;
    throw error;
  }

  const data = await res.json();
  return data.data || data;
};

// Global SWR configuration
export const swrConfig: SWRConfiguration = {
  fetcher,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 30000, // 30 seconds
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  shouldRetryOnError: true,
  onError: (error) => {
    console.error('SWR Error:', error);
  },
};

// Specific configurations for different data types
export const policyConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateIfStale: true,
  revalidateOnMount: true,
};

export const progressConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 30000, // 30 seconds for real-time updates
  revalidateIfStale: true,
};

export const activitiesConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 60000, // 1 minute
  revalidateIfStale: true,
};
