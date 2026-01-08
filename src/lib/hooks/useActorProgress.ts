import useSWR from 'swr';
import { progressConfig } from '@/lib/config/swrConfig';
import { useMemo } from 'react';

export interface ActorProgress {
  id: string;
  type: string;
  name: string;
  email: string;
  phone?: string;
  informationComplete: boolean;
  completedAt?: string;
  tokenExpiry?: string;
  lastActivity?: string;
  documentsCount: number;
  requiredDocuments: number;
}

export interface PolicyProgress {
  id: string;
  policyNumber: string;
  propertyAddress: string;
  status: string;
  guarantorType: string;
  createdAt: string;
  overallProgress: number;
  actors: ActorProgress[];
  activities: any[];
}

export function useActorProgress(policyId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PolicyProgress>(
    policyId ? `/api/policies/${policyId}/progress` : null,
    progressConfig
  );

  // Calculate progress statistics
  const stats = useMemo(() => {
    if (!data) return null;

    const totalActors = data.actors.length;
    const completedActors = data.actors.filter(a => a.informationComplete).length;
    const pendingActors = totalActors - completedActors;

    // Calculate document progress
    const totalDocuments = data.actors.reduce((sum, actor) => sum + actor.requiredDocuments, 0);
    const uploadedDocuments = data.actors.reduce((sum, actor) => sum + actor.documentsCount, 0);

    // Calculate individual actor progress
    const actorProgressMap = data.actors.reduce((map, actor) => {
      const docProgress = actor.requiredDocuments > 0
        ? (actor.documentsCount / actor.requiredDocuments) * 100
        : 0;

      map[actor.id] = {
        id: actor.id,
        type: actor.type,
        name: actor.name,
        percentage: actor.informationComplete ? 100 : Math.min(docProgress, 99),
        completedFields: actor.informationComplete ? 1 : 0,
        totalFields: 1,
        documentsUploaded: actor.documentsCount,
        documentsRequired: actor.requiredDocuments,
        isComplete: actor.informationComplete,
        completedAt: actor.completedAt,
        lastActivity: actor.lastActivity,
      };

      return map;
    }, {} as Record<string, any>);

    return {
      overall: data.overallProgress,
      totalActors,
      completedActors,
      pendingActors,
      totalDocuments,
      uploadedDocuments,
      documentProgress: totalDocuments > 0 ? Math.round((uploadedDocuments / totalDocuments) * 100) : 0,
      byActor: actorProgressMap,
    };
  }, [data]);

  // Get progress for a specific actor
  const getActorProgress = (actorId: string) => {
    return stats?.byActor[actorId] || null;
  };

  // Get actors by type
  const getActorsByType = (type: string) => {
    return data?.actors.filter(actor => actor.type === type) || [];
  };

  // Check if all actors are complete
  const allActorsComplete = useMemo(() => {
    if (!data) return false;
    return data.actors.every(actor => actor.informationComplete);
  }, [data]);

  // Get actors with pending information
  const pendingActors = useMemo(() => {
    if (!data) return [];
    return data.actors.filter(actor => !actor.informationComplete);
  }, [data]);

  // Get actors with expiring tokens (within 7 days)
  const actorsWithExpiringTokens = useMemo(() => {
    if (!data) return [];
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return data.actors.filter(actor => {
      if (!actor.tokenExpiry) return false;
      const expiry = new Date(actor.tokenExpiry);
      return expiry <= sevenDaysFromNow && expiry > new Date();
    });
  }, [data]);

  return {
    data,
    stats,
    isLoading,
    error,
    refresh: mutate,
    getActorProgress,
    getActorsByType,
    allActorsComplete,
    pendingActors,
    actorsWithExpiringTokens,
  };
}
