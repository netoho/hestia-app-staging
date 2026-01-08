import useSWR from 'swr';
import { activitiesConfig } from '@/lib/config/swrConfig';
import { useMemo } from 'react';

export interface Activity {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  performedBy?: string;
  performedByType?: string;
  details?: any;
}

export function usePolicyActivities(policyId: string | null, options?: {
  actorId?: string;
  actorType?: string;
  limit?: number;
}) {
  const { data, error, isLoading, mutate } = useSWR<Activity[]>(
    policyId ? `/api/policies/${policyId}/activities` : null,
    activitiesConfig
  );

  // Filter activities by actor ID or type
  const filteredActivities = useMemo(() => {
    if (!data) return [];

    let filtered = [...data];

    if (options?.actorId) {
      filtered = filtered.filter(activity => {
        return activity.details?.actorId === options.actorId;
      });
    }

    if (options?.actorType) {
      filtered = filtered.filter(activity => {
        return activity.performedByType === options.actorType ||
          activity.details?.actorType === options.actorType;
      });
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }, [data, options?.actorId, options?.actorType, options?.limit]);

  // Group activities by date
  const activitiesByDate = useMemo(() => {
    if (!filteredActivities.length) return {};

    return filteredActivities.reduce((groups, activity) => {
      const date = new Date(activity.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
      return groups;
    }, {} as Record<string, Activity[]>);
  }, [filteredActivities]);

  // Get recent activities (last 5)
  const recentActivities = useMemo(() => {
    return filteredActivities.slice(0, 5);
  }, [filteredActivities]);

  // Get activity count by action type
  const activityCounts = useMemo(() => {
    if (!data) return {};

    return data.reduce((counts, activity) => {
      const action = activity.action;
      counts[action] = (counts[action] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }, [data]);

  // Get last activity time
  const lastActivityTime = useMemo(() => {
    if (!filteredActivities.length) return null;
    return new Date(filteredActivities[0].createdAt);
  }, [filteredActivities]);

  return {
    activities: filteredActivities,
    allActivities: data || [],
    activitiesByDate,
    recentActivities,
    activityCounts,
    lastActivityTime,
    isLoading,
    error,
    refresh: mutate,
  };
}
