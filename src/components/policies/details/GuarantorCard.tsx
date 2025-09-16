import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Shield, FileText } from 'lucide-react';

interface GuarantorCardProps {
  guarantor: any;
  type: 'jointObligor' | 'aval';
  onSendInvitation?: (id: string) => void;
  sending?: boolean;
  getVerificationBadge: (status: string) => React.ReactNode;
}

export default function GuarantorCard({
  guarantor,
  type,
  onSendInvitation,
  sending,
  getVerificationBadge
}: GuarantorCardProps) {
  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return `$${amount.toLocaleString('es-MX')}`;
  };

  const Icon = type === 'jointObligor' ? Users : Shield;
  const title = type === 'jointObligor' ? 'Obligado Solidario' : 'Aval';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{guarantor.fullName}</span>
          <div className="flex items-center gap-2">
            {getVerificationBadge(guarantor.verificationStatus || 'PENDING')}
            {guarantor.informationComplete ? (
              <Badge className="bg-green-500 text-white">Completo</Badge>
            ) : (
              <Badge className="bg-orange-500 text-white">Pendiente</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{guarantor.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Teléfono</p>
              <p className="font-medium">{guarantor.phone}</p>
            </div>
            {guarantor.nationality && (
              <div>
                <p className="text-sm text-gray-600">Nacionalidad</p>
                <p className="font-medium">
                  {guarantor.nationality === 'MEXICAN' ? 'Mexicana' : 'Extranjera'}
                </p>
              </div>
            )}
            {guarantor.occupation && (
              <div>
                <p className="text-sm text-gray-600">Ocupación</p>
                <p className="font-medium">{guarantor.occupation}</p>
              </div>
            )}
            {guarantor.monthlyIncome && (
              <div>
                <p className="text-sm text-gray-600">Ingreso Mensual</p>
                <p className="font-medium">{formatCurrency(guarantor.monthlyIncome)}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {guarantor.companyName && (
              <div>
                <p className="text-sm text-gray-600">Empresa</p>
                <p className="font-medium">{guarantor.companyName}</p>
              </div>
            )}

            {/* Aval-specific property information */}
            {type === 'aval' && (
              <>
                <h4 className="font-semibold text-sm">Propiedad en Garantía</h4>
                {guarantor.propertyAddress && (
                  <div>
                    <p className="text-sm text-gray-600">Dirección</p>
                    <p className="font-medium">{guarantor.propertyAddress}</p>
                  </div>
                )}
                {guarantor.propertyValue && (
                  <div>
                    <p className="text-sm text-gray-600">Valor</p>
                    <p className="font-medium">{formatCurrency(guarantor.propertyValue)}</p>
                  </div>
                )}
                {guarantor.propertyDeedNumber && (
                  <div>
                    <p className="text-sm text-gray-600">Número de Escritura</p>
                    <p className="font-medium">{guarantor.propertyDeedNumber}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {guarantor.references && guarantor.references.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2">Referencias</p>
            <div className="flex gap-2 flex-wrap">
              {guarantor.references.map((ref: any, idx: number) => (
                <Badge key={idx} variant="outline">
                  {ref.name} - {ref.relationship}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {guarantor.documents && guarantor.documents.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2">Documentos</p>
            <div className="flex gap-2 flex-wrap">
              {guarantor.documents.map((doc: any) => (
                <Badge key={doc.id} variant="secondary">
                  <FileText className="h-3 w-3 mr-1" />
                  {doc.documentType}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}