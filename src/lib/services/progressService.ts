import { Tenant, Landlord, JointObligor, Aval } from '@prisma/client';

interface ActorWithDocuments {
  id: string;
  informationComplete: boolean;
  documents?: any[];
  references?: any[];
}

interface PolicyWithActors {
  landlords: (Landlord & { documents?: any[] })[];
  tenant?: (Tenant & { documents?: any[]; references?: any[] }) | null;
  jointObligors: (JointObligor & { documents?: any[]; references?: any[] })[];
  avals: (Aval & { documents?: any[]; references?: any[] })[];
  guarantorType: string;
}

interface ActorProgress {
  percentage: number;
  completedFields: number;
  totalFields: number;
  documentsUploaded: number;
  documentsRequired: number;
}

interface PolicyProgress {
  overall: number;
  byActor: Record<string, ActorProgress>;
  completedActors: number;
  totalActors: number;
  documentsUploaded: number;
  documentsRequired: number;
}

/**
 * Calculate required documents count based on actor type
 */
function getRequiredDocumentsCount(actorType: string): number {
  switch (actorType) {
    case 'landlord':
      return 2; // ID and address proof
    case 'tenant':
      return 3; // ID, income proof, address proof
    case 'jointObligor':
      return 3; // ID, income proof, address proof
    case 'aval':
      return 4; // ID, income proof, address proof, property deed
    default:
      return 0;
  }
}

/**
 * Calculate progress for individual actor
 */
export function calculateActorProgress(
  actor: ActorWithDocuments | null | undefined,
  actorType: string
): ActorProgress {
  if (!actor) {
    return {
      percentage: 0,
      completedFields: 0,
      totalFields: 0,
      documentsUploaded: 0,
      documentsRequired: getRequiredDocumentsCount(actorType),
    };
  }

  const documentsUploaded = actor.documents?.length || 0;
  const documentsRequired = getRequiredDocumentsCount(actorType);
  const referencesProvided = actor.references?.length || 0;

  // Calculate field completion
  // Information is complete when informationComplete flag is true
  const completedFields = actor.informationComplete ? 1 : 0;
  const totalFields = 1;

  // Calculate overall percentage:
  // - 50% for information completion
  // - 30% for documents
  // - 20% for references (if applicable)
  let percentage = 0;

  // Information completion (50%)
  if (actor.informationComplete) {
    percentage += 50;
  }

  // Documents completion (30%)
  if (documentsRequired > 0) {
    const docPercentage = Math.min((documentsUploaded / documentsRequired) * 30, 30);
    percentage += docPercentage;
  }

  // References completion (20%) - only for tenant, jointObligor
  if (['tenant', 'jointObligor'].includes(actorType)) {
    const requiredReferences = 2;
    const refPercentage = Math.min((referencesProvided / requiredReferences) * 20, 20);
    percentage += refPercentage;
  } else if (actorType === 'landlord' || actorType === 'aval') {
    // For landlord and aval, redistribute the 20% to documents
    if (documentsRequired > 0) {
      const additionalDocPercentage = Math.min((documentsUploaded / documentsRequired) * 20, 20);
      percentage += additionalDocPercentage;
    }
  }

  return {
    percentage: Math.round(percentage),
    completedFields,
    totalFields,
    documentsUploaded,
    documentsRequired,
  };
}

/**
 * Calculate overall policy progress including all actors
 */
export function calculatePolicyProgress(policy: PolicyWithActors): PolicyProgress {
  const actorProgressMap: Record<string, ActorProgress> = {};
  let totalActors = 0;
  let completedActors = 0;
  let totalDocumentsUploaded = 0;
  let totalDocumentsRequired = 0;

  // Process all landlords
  if (policy.landlords && policy.landlords.length > 0) {
    policy.landlords.filter(landlord => landlord.isPrimary).forEach((landlord) => {
      const progress = calculateActorProgress(landlord, 'landlord');
      actorProgressMap[`landlord-${landlord.id}`] = progress;
      totalActors++;
      if (landlord.informationComplete) completedActors++;
      totalDocumentsUploaded += progress.documentsUploaded;
      totalDocumentsRequired += progress.documentsRequired;
    });
  } else {
    // Count as pending actor if no landlords exist
    totalActors++;
    totalDocumentsRequired += getRequiredDocumentsCount('landlord');
  }

  // Process tenant
  if (policy.tenant) {
    const progress = calculateActorProgress(policy.tenant, 'tenant');
    actorProgressMap[`tenant-${policy.tenant.id}`] = progress;
    totalActors++;
    if (policy.tenant.informationComplete) completedActors++;
    totalDocumentsUploaded += progress.documentsUploaded;
    totalDocumentsRequired += progress.documentsRequired;
  }

  // Process joint obligors
  if (policy.guarantorType === 'JOINT_OBLIGOR' || policy.guarantorType === 'BOTH') {
    if (policy.jointObligors.length > 0) {
      policy.jointObligors.forEach((jo) => {
        const progress = calculateActorProgress(jo, 'jointObligor');
        actorProgressMap[`jointObligor-${jo.id}`] = progress;
        totalActors++;
        if (jo.informationComplete) completedActors++;
        totalDocumentsUploaded += progress.documentsUploaded;
        totalDocumentsRequired += progress.documentsRequired;
      });
    } else {
      // Count as pending actor
      totalActors++;
      totalDocumentsRequired += getRequiredDocumentsCount('jointObligor');
    }
  }

  // Process avals
  if (policy.guarantorType === 'AVAL' || policy.guarantorType === 'BOTH') {
    if (policy.avals.length > 0) {
      policy.avals.forEach((aval) => {
        const progress = calculateActorProgress(aval, 'aval');
        actorProgressMap[`aval-${aval.id}`] = progress;
        totalActors++;
        if (aval.informationComplete) completedActors++;
        totalDocumentsUploaded += progress.documentsUploaded;
        totalDocumentsRequired += progress.documentsRequired;
      });
    } else {
      // Count as pending actor
      totalActors++;
      totalDocumentsRequired += getRequiredDocumentsCount('aval');
    }
  }

  // Calculate overall progress
  const overallProgress = totalActors > 0
    ? Math.round((completedActors / totalActors) * 100)
    : 0;

  return {
    overall: overallProgress,
    byActor: actorProgressMap,
    completedActors,
    totalActors,
    documentsUploaded: totalDocumentsUploaded,
    documentsRequired: totalDocumentsRequired,
  };
}
