import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, Mail, Phone, FileText, CheckCircle2, Users, Shield, Building, Edit, Send, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { InlineDocumentManager } from '@/components/documents/InlineDocumentManager';
import { useDocumentOperations } from '@/hooks/useDocumentOperations';
import { DocumentCategory } from "@/prisma/generated/prisma-client/enums";
import { useMemo } from 'react';
import { formatFullName } from '@/lib/utils/names';

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

// Get a display label for the category
const getCategoryLabel = (cat: string) => {
  const labels: Record<string, string> = {
    [DocumentCategory.IDENTIFICATION]: 'Identificación',
    [DocumentCategory.INCOME_PROOF]: 'Comprobante de Ingresos',
    [DocumentCategory.ADDRESS_PROOF]: 'Comprobante de Domicilio',
    [DocumentCategory.EMPLOYMENT_LETTER]: 'Carta Laboral',
    [DocumentCategory.BANK_STATEMENT]: 'Estado de Cuenta',
    [DocumentCategory.PROPERTY_DEED]: 'Escritura de Propiedad',
    [DocumentCategory.TAX_RETURN]: 'Declaración de Impuestos',
    [DocumentCategory.TAX_STATUS_CERTIFICATE]: 'Constancia de Situación Fiscal',
    [DocumentCategory.COMPANY_CONSTITUTION]: 'Escritura Constitutiva',
    [DocumentCategory.LEGAL_POWERS]: 'Poderes Legales',
    [DocumentCategory.PROPERTY_TAX_STATEMENT]: 'Boleta Predial',
    [DocumentCategory.OTHER]: 'Otros',
  };
  return labels[cat] || cat;
};

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

  // Calculate actor progress
  const calculateProgress = () => {
    if (!actor) return 0;
    if (actor.informationComplete) return 100;

    let completed = 0;
    let total = 10;

    // Check basic fields
    if (actor.companyName || (actor.firstName && actor.paternalLastName)) completed++;
    if (actor.email) completed++;
    if (actor.phone) completed++;
    if (actor.rfc || actor.companyRfc) completed++;
    if (actor.address || actor.addressDetails) completed++;

    // Employment/business
    if (actor.occupation || (actor.legalRepFirstName && actor.legalRepPaternalLastName)) completed++;
    if (actor.monthlyIncome) completed++;

    // Additional
    if (actor.curp || actor.passport) completed++;

    // References
    if (actor.references?.length > 0 || actor.commercialReferences?.length > 0) completed++;

    // Documents
    if (actor.documents?.length > 0) completed++;

    return Math.round((completed / total) * 100);
  };

  const progress = calculateProgress();

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return `$${amount.toLocaleString('es-MX')}`;
  };

  const getActorTitle = () => {
    switch (actorType) {
      case 'tenant':
        return 'Información del Inquilino';
      case 'landlord':
        return 'Información del Arrendador';
      case 'jointObligor':
        return 'Obligado Solidario';
      case 'aval':
        return 'Aval';
      default:
        return 'Actor';
    }
  };

  const getActorIcon = () => {
    switch (actorType) {
      case 'tenant':
        return <User className="h-5 w-5" />;
      case 'landlord':
        return <Building className="h-5 w-5" />;
      case 'jointObligor':
        return <Users className="h-5 w-5" />;
      case 'aval':
        return <Shield className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  if (!actor) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-12 w-12 mx-auto mb-4 text-gray-400">
            {getActorIcon()}
          </div>
          <p className="text-gray-600 mb-4">No se ha capturado información del {getActorTitle().toLowerCase()}</p>
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
  const isCompany = actor.tenantType === 'COMPANY' || actor.isCompany;

  // Group documents by category
  const documentsByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};

    // Group all documents from the hook
    Object.entries(documents).forEach(([category, docs]) => {
      if (docs && docs.length > 0) {
        grouped[category] = docs;
      }
    });

    return grouped;
  }, [documents]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0 mt-1">
              {getActorIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg">
                {actorType === 'tenant' || actorType === 'landlord' ? getActorTitle() : displayName}
              </h3>
              <p className="text-sm text-gray-600">{actor.email || 'Sin email'}</p>
              {actor.phone && (
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                  <Phone className="h-3 w-3" />
                  {actor.phone}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {getVerificationBadge && getVerificationBadge(actor.verificationStatus || 'PENDING')}
              {actor.informationComplete ? (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completo
                </Badge>
              ) : (
                <Badge className="bg-orange-500 text-white">Pendiente</Badge>
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
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Quick Stats - Responsive */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
          <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="text-base sm:text-lg font-bold text-purple-600">{actor.documents?.length || 0}</div>
            <div className="text-[10px] sm:text-xs text-gray-600">Documentos</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="text-base sm:text-lg font-bold text-green-600">
              {(actor.references?.length || 0) + (actor.commercialReferences?.length || 0)}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-600">Referencias</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="text-base sm:text-lg font-bold text-blue-600">{progress}%</div>
            <div className="text-[10px] sm:text-xs text-gray-600">Completo</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">
              Información Personal
            </h3>
            {(actor.tenantType || actor.isCompany) && (
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <Badge variant="outline">
                  {isCompany ? 'Empresa' : 'Persona Física'}
                </Badge>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Nombre</p>
              <p className="font-medium">{displayName}</p>
            </div>
            {actor.rfc && (
              <div>
                <p className="text-sm text-gray-600">RFC</p>
                <p className="font-medium">{actor.rfc}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {actor.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Teléfono</p>
              <p className="font-medium flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {actor.phone}
              </p>
            </div>
            {actor.nationality && (
              <div>
                <p className="text-sm text-gray-600">Nacionalidad</p>
                <p className="font-medium">
                  {actor.nationality === 'MEXICAN' ? 'Mexicana' : 'Extranjera'}
                </p>
              </div>
            )}
            {actor.curp && (
              <div>
                <p className="text-sm text-gray-600">CURP</p>
                <p className="font-medium font-mono">{actor.curp}</p>
              </div>
            )}
            {actor.passport && (
              <div>
                <p className="text-sm text-gray-600">Pasaporte</p>
                <p className="font-medium">{actor.passport}</p>
              </div>
            )}
            {actor.address && (
              <div>
                <p className="text-sm text-gray-600">Dirección</p>
                <p className="font-medium">{actor.address}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {/* Employment Information */}
            {(actor.employmentStatus || actor.occupation || actor.companyName || actor.monthlyIncome) && (
              <>
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">
                  Información Laboral
                </h3>
                {actor.employmentStatus && (
                  <div>
                    <p className="text-sm text-gray-600">Situación Laboral</p>
                    <p className="font-medium">{actor.employmentStatus}</p>
                  </div>
                )}
                {actor.occupation && (
                  <div>
                    <p className="text-sm text-gray-600">Ocupación</p>
                    <p className="font-medium">{actor.occupation}</p>
                  </div>
                )}
                {actor.companyName && !isCompany && (
                  <div>
                    <p className="text-sm text-gray-600">Empresa</p>
                    <p className="font-medium">{actor.companyName}</p>
                  </div>
                )}
                {actor.monthlyIncome && (
                  <div>
                    <p className="text-sm text-gray-600">Ingreso Mensual</p>
                    <p className="font-medium">{formatCurrency(actor.monthlyIncome)}</p>
                  </div>
                )}
              </>
            )}

            {/* Banking Information (for landlords) */}
            {(actor.bankName || actor.clabe) && (
              <>
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">
                  Información Bancaria
                </h3>
                {actor.bankName && (
                  <div>
                    <p className="text-sm text-gray-600">Banco</p>
                    <p className="font-medium">{actor.bankName}</p>
                  </div>
                )}
                {actor.accountNumber && (
                  <div>
                    <p className="text-sm text-gray-600">Número de Cuenta</p>
                    <p className="font-medium">{actor.accountNumber}</p>
                  </div>
                )}
                {actor.clabe && (
                  <div>
                    <p className="text-sm text-gray-600">CLABE</p>
                    <p className="font-medium font-mono">{actor.clabe}</p>
                  </div>
                )}
              </>
            )}

            {/* Property Information (for avals) */}
            {actorType === 'aval' && (actor.propertyAddress || actor.propertyValue || actor.propertyDeedNumber) && (
              <>
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">
                  Propiedad en Garantía
                </h3>
                {actor.propertyAddress && (
                  <div>
                    <p className="text-sm text-gray-600">Dirección</p>
                    <p className="font-medium">{actor.propertyAddress}</p>
                  </div>
                )}
                {actor.propertyValue && (
                  <div>
                    <p className="text-sm text-gray-600">Valor</p>
                    <p className="font-medium">{formatCurrency(actor.propertyValue)}</p>
                  </div>
                )}
                {actor.propertyDeedNumber && (
                  <div>
                    <p className="text-sm text-gray-600">Número de Escritura</p>
                    <p className="font-medium">{actor.propertyDeedNumber}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Additional Information */}
        {actor.additionalInfo && (
          <div className="mt-6">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">
              Información Adicional
            </h3>
            <div>
              <p className="text-sm text-gray-600">{actor.additionalInfo}</p>
            </div>
          </div>
        )}

        {/* References */}
        {actor.references && actor.references.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">
              Referencias Personales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {actor.references.map((ref: any, index: number) => (
                <Card key={index} className="p-3">
                  <p className="font-medium text-sm">{ref.name}</p>
                  <p className="text-xs text-gray-600">{ref.relationship}</p>
                  <p className="text-xs text-gray-600">{ref.phone}</p>
                  {ref.email && <p className="text-xs text-gray-600 truncate">{ref.email}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Documents Section - Using InlineDocumentManager */}
        {actor.documents && actor.documents.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">
              Documentos
            </h3>
            <div className="space-y-3">
              {Object.entries(documentsByCategory).map(([category, docs]) => {
                const categoryOperations = Object.values(operations).filter(op =>
                  op.category === category ||
                  docs.some((doc: any) => doc.id === op.documentId)
                );

                return (
                  <InlineDocumentManager
                    key={category}
                    label={getCategoryLabel(category)}
                    documentType={category}
                    documents={docs}
                    readOnly={true}
                    onDownload={(docId, fileName) => downloadDocument(docId, fileName)}
                    operations={categoryOperations}
                    onUpload={() => {}} // Read-only, no upload
                    allowMultiple={false}
                  />
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
