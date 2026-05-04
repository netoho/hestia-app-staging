import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Phone, Edit, Send, RefreshCw, CheckCircle2, FileSearch } from 'lucide-react';
import { CompletionBadge } from '@/components/shared/CompletionBadge';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { InlineDocumentManager } from '@/components/documents/InlineDocumentManager';
import { useDocumentOperations } from '@/hooks/useDocumentOperations';
import { DocumentCategory } from "@/prisma/generated/prisma-client/enums";
import { useMemo } from 'react';
import { formatFullName } from '@/lib/utils/names';
import { getActorTitle, getActorIcon, calculateActorProgress } from '@/lib/utils/actor';
import { getDocumentCategoryLabel } from '@/lib/constants/documentCategories';
import { getDocumentRequirements } from '@/lib/constants/actorDocumentRequirements';
import { trpc } from '@/lib/trpc/client';
import { getInvestigationStatusLabel } from '@/lib/constants/investigationConfig';
import { TenantSections, LandlordSections, JointObligorSections, AvalSections } from './ActorInfoSections';

function getIsCompany(actorType: string, actor: any): boolean {
  switch (actorType) {
    case 'tenant': return actor.tenantType === 'COMPANY';
    case 'jointObligor': return actor.jointObligorType === 'COMPANY';
    case 'aval': return actor.avalType === 'COMPANY';
    default: return !!actor.isCompany;
  }
}

interface ActorCardProps {
  actor: any;
  actorType: 'tenant' | 'landlord' | 'jointObligor' | 'aval';
  policyId: string;
  getVerificationBadge?: (status: string) => React.ReactNode;
  onEditClick?: () => void;
  onSendInvitation?: () => void;
  onMarkComplete?: () => void;
  canEdit?: boolean;
  sending?: boolean;
}

export default function ActorCard({
  actor,
  actorType,
  policyId,
  getVerificationBadge,
  onEditClick,
  onSendInvitation,
  onMarkComplete,
  canEdit,
  sending
}: ActorCardProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const isStaffOrAdmin = canEdit !== undefined ? canEdit : (session?.user?.role === 'ADMIN' || session?.user?.role === 'STAFF');

  // Map actorType to the format expected by useDocumentOperations
  const documentActorType = useMemo(() => {
    switch (actorType) {
      case 'jointObligor':
        return 'joint-obligor';
      default:
        return actorType;
    }
  }, [actorType]);

  // Use document operations hook for document management
  const { documents, downloadDocument, operations } = useDocumentOperations({
    token: actor?.id || null,
    actorType: documentActorType as any,
    initialDocuments: actor?.documents || [],
    isAdminEdit: true, // Using admin endpoints when viewing from ActorCard
  });

  const progress = calculateActorProgress(actor);

  // Query for existing investigations (only for non-landlords)
  const investigationActorType = useMemo(() => {
    switch (actorType) {
      case 'tenant': return 'TENANT';
      case 'jointObligor': return 'JOINT_OBLIGOR';
      case 'aval': return 'AVAL';
      default: return null;
    }
  }, [actorType]);

  const { data: investigations } = trpc.investigation.getByActor.useQuery(
    { actorType: investigationActorType as any, actorId: actor?.id || '' },
    { enabled: !!actor?.id && !!investigationActorType }
  );

  const latestInvestigation = investigations?.[0];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success' as const;
      case 'REJECTED': return 'error' as const;
      default: return 'warning' as const;
    }
  };

  const ActorIcon = getActorIcon(actorType);

  if (!actor) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60">
            <ActorIcon className="h-5 w-5" />
          </div>
          <p className="text-muted-foreground mb-4">No se ha capturado información del {getActorTitle(actorType).toLowerCase()}</p>
          {isStaffOrAdmin && (
            <Button onClick={() => {
              if (onEditClick) {
                onEditClick();
              } else if (actorType === 'landlord') {
                router.push(`/dashboard/policies/${policyId}/landlord`);
              } else if (actorType === 'tenant') {
                router.push(`/dashboard/policies/${policyId}/tenant`);
              }
            }}>
              <Edit className="mr-2 h-4 w-4" />
              Capturar Información
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const displayName = actor.companyName ||
    (actor.firstName ? formatFullName(
      actor.firstName,
      actor.paternalLastName || '',
      actor.maternalLastName || '',
      actor.middleName || undefined
    ) : 'Sin nombre');

  // Group documents by category
  const documentsByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    Object.entries(documents).forEach(([category, docs]) => {
      if (docs && docs.length > 0) {
        grouped[category] = docs;
      }
    });
    return grouped;
  }, [documents]);

  // Compute all document categories to display (required + already uploaded)
  const allDocumentCategories = useMemo(() => {
    const isCompany = getIsCompany(actorType, actor);

    const options: { nationality?: 'MEXICAN' | 'FOREIGN'; guaranteeMethod?: 'property' | 'income' } = {};
    if (actor.nationality) options.nationality = actor.nationality;
    if (actor.guaranteeMethod) options.guaranteeMethod = actor.guaranteeMethod;

    const requirements = getDocumentRequirements(actorType, isCompany, options);
    const requiredCategories = requirements.map(r => r.category as string);
    const uploadedCategories = Object.keys(documentsByCategory);

    // Union: required first (in order), then any uploaded categories not in requirements
    const seen = new Set<string>();
    const result: string[] = [];
    for (const cat of requiredCategories) {
      if (!seen.has(cat)) { seen.add(cat); result.push(cat); }
    }
    for (const cat of uploadedCategories) {
      if (!seen.has(cat)) { seen.add(cat); result.push(cat); }
    }
    return result;
  }, [actor, actorType, documentsByCategory]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg flex-shrink-0 mt-1">
              <ActorIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg">
                {actorType === 'tenant' || actorType === 'landlord' ? getActorTitle(actorType) : displayName}
              </h3>
              <p className="text-sm text-muted-foreground">{actor.email || 'Sin email'}</p>
              {actor.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="h-4 w-4" />
                  {actor.phone}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {getVerificationBadge && getVerificationBadge(actor.verificationStatus || 'PENDING')}
              <CompletionBadge isComplete={actor.informationComplete} showIcon />
              {latestInvestigation && (
                <Badge variant={getStatusBadgeVariant(latestInvestigation.status)}>
                  {getInvestigationStatusLabel(latestInvestigation.status as any)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!actor.informationComplete && onSendInvitation && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSendInvitation}
                  disabled={sending}
                  className="transition-all hover:scale-105"
                >
                  {sending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Invitar</span>
                    </>
                  )}
                </Button>
              )}
              {!actor.informationComplete && isStaffOrAdmin && onMarkComplete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onMarkComplete}
                  className="transition-all hover:scale-105"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Completar</span>
                </Button>
              )}
              {isStaffOrAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (onEditClick) {
                      onEditClick();
                    } else if (actorType === 'landlord') {
                      router.push(`/dashboard/policies/${policyId}/landlord`);
                    } else if (actorType === 'tenant') {
                      router.push(`/dashboard/policies/${policyId}/tenant`);
                    } else if (actorType === 'jointObligor') {
                      router.push(`/dashboard/policies/${policyId}/joint-obligor/${actor.id}`);
                    } else if (actorType === 'aval') {
                      router.push(`/dashboard/policies/${policyId}/aval/${actor.id}`);
                    }
                  }}
                  className="transition-all hover:scale-105"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Editar</span>
                </Button>
              )}
              {actor.informationComplete && isStaffOrAdmin && actorType !== 'landlord' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/policies/${policyId}/investigation/${actorType}/${actor.id}/new`)}
                  className="transition-all hover:scale-105"
                >
                  <FileSearch className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Investigar</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        {!actor.informationComplete && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Progreso de Información</span>
              <span className="font-bold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        )}

        {/* Quick Stats - Responsive */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg">
            <div className="text-base sm:text-lg font-bold text-purple-600">{actor.documents?.length || 0}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Documentos</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg">
            <div className="text-base sm:text-lg font-bold text-green-600">
              {(actor.personalReferences?.length || 0) + (actor.commercialReferences?.length || 0)}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">Referencias</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg">
            <div className="text-base sm:text-lg font-bold text-blue-600">{progress}%</div>
            <div className="text-xs sm:text-sm text-muted-foreground">Completo</div>
          </div>
        </div>

        {/* Actor-specific sectioned information */}
        <div className="mb-6">
          {actorType === 'tenant' && <TenantSections actor={actor} />}
          {actorType === 'landlord' && <LandlordSections actor={actor} />}
          {actorType === 'jointObligor' && <JointObligorSections actor={actor} />}
          {actorType === 'aval' && <AvalSections actor={actor} />}
        </div>

        {/* Documents Section - Using InlineDocumentManager */}
        <div className="mt-6">
          <h3 className="font-semibold text-base text-foreground uppercase tracking-wider mb-3">
            Documentos
          </h3>
          <div className="space-y-3">
            {allDocumentCategories.map((category) => {
              const docs = documentsByCategory[category] || [];
              const categoryOperations = Object.values(operations).filter(op =>
                op.category === category ||
                docs.some((doc: any) => doc.id === op.documentId)
              );

              return (
                <InlineDocumentManager
                  key={category}
                  label={getDocumentCategoryLabel(category as DocumentCategory)}
                  documentType={category}
                  documents={docs}
                  readOnly={true}
                  onDownload={(docId, fileName) => downloadDocument(docId, fileName)}
                  operations={categoryOperations}
                  onUpload={() => {}}
                  allowMultiple={false}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
