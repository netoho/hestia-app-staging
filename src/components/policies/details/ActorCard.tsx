import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, FileText, CheckCircle2, Users, Shield, Building, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ActorCardProps {
  actor: any;
  actorType: 'tenant' | 'landlord' | 'jointObligor' | 'aval';
  policyId: string;
  getVerificationBadge?: (status: string) => React.ReactNode;
}

export default function ActorCard({ actor, actorType, policyId, getVerificationBadge }: ActorCardProps) {
  const router = useRouter();

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
          {actorType === 'landlord' && (
            <Button onClick={() => router.push(`/dashboard/policies/${policyId}/landlord`)}>
              <Edit className="mr-2 h-4 w-4" />
              Capturar Información
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const displayName = actor.fullName || actor.companyName || 'Sin nombre';
  const isCompany = actor.tenantType === 'COMPANY' || actor.isCompany;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getActorIcon()}
            <span className="text-base">
              {actorType === 'tenant' || actorType === 'landlord' ? getActorTitle() : displayName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getVerificationBadge && getVerificationBadge(actor.verificationStatus || 'PENDING')}
            {actor.informationComplete ? (
              <Badge className="bg-green-500 text-white">Completo</Badge>
            ) : (
              <Badge className="bg-orange-500 text-white">Pendiente</Badge>
            )}
            {actorType === 'landlord' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/dashboard/policies/${policyId}/landlord`)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
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

        {/* References */}
        {actor.references && actor.references.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">
              Referencias Personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {actor.references.map((ref: any, index: number) => (
                <Card key={index} className="p-3">
                  <p className="font-medium text-sm">{ref.name}</p>
                  <p className="text-xs text-gray-600">{ref.relationship}</p>
                  <p className="text-xs text-gray-600">{ref.phone}</p>
                  {ref.email && <p className="text-xs text-gray-600">{ref.email}</p>}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {actor.documents && actor.documents.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">
              Documentos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {actor.documents.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">{doc.documentType}</p>
                      <p className="text-xs text-gray-500">{doc.originalName}</p>
                    </div>
                  </div>
                  {doc.verifiedAt && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}