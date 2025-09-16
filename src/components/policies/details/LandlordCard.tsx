import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, Mail, Phone, MapPin, Edit, CheckCircle2 } from 'lucide-react';
import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface LandlordCardProps {
  landlord: any;
  policyId: string;
}

export default function LandlordCard({ landlord, policyId }: LandlordCardProps) {
  const router = useRouter();

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return `$${amount.toLocaleString('es-MX')}`;
  };

  if (!landlord) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No se ha capturado información del arrendador</p>
          <Button onClick={() => router.push(`/dashboard/policies/${policyId}/landlord`)}>
            <Edit className="mr-2 h-4 w-4" />
            Capturar Información
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Información del Arrendador
          </div>
          <div className="flex items-center gap-2">
            {landlord.informationComplete ? (
              <Badge className="bg-green-500 text-white">Completo</Badge>
            ) : (
              <Badge className="bg-orange-500 text-white">Pendiente</Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/dashboard/policies/${policyId}/landlord`)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">
              Información Personal
            </h3>
            {landlord.isCompany && (
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <Badge variant="outline">Empresa</Badge>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">
                {landlord.isCompany ? 'Razón Social' : 'Nombre Completo'}
              </p>
              <p className="font-medium">{landlord.fullName}</p>
            </div>
            {landlord.rfc && (
              <div>
                <p className="text-sm text-gray-600">RFC</p>
                <p className="font-medium">{landlord.rfc}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {landlord.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Teléfono</p>
              <p className="font-medium flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {landlord.phone}
              </p>
            </div>
            {landlord.address && (
              <div>
                <p className="text-sm text-gray-600">Dirección</p>
                <p className="font-medium flex items-start gap-1">
                  <MapPin className="h-4 w-4 mt-0.5" />
                  {landlord.address}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {(landlord.bankName || landlord.clabe) && (
              <>
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">
                  Información Bancaria
                </h3>
                {landlord.bankName && (
                  <div>
                    <p className="text-sm text-gray-600">Banco</p>
                    <p className="font-medium">{landlord.bankName}</p>
                  </div>
                )}
                {landlord.accountNumber && (
                  <div>
                    <p className="text-sm text-gray-600">Número de Cuenta</p>
                    <p className="font-medium">{landlord.accountNumber}</p>
                  </div>
                )}
                {landlord.clabe && (
                  <div>
                    <p className="text-sm text-gray-600">CLABE</p>
                    <p className="font-medium font-mono">{landlord.clabe}</p>
                  </div>
                )}
              </>
            )}

            {!landlord.isCompany && (landlord.occupation || landlord.companyName) && (
              <>
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">
                  Información Laboral
                </h3>
                {landlord.occupation && (
                  <div>
                    <p className="text-sm text-gray-600">Ocupación</p>
                    <p className="font-medium">{landlord.occupation}</p>
                  </div>
                )}
                {landlord.companyName && (
                  <div>
                    <p className="text-sm text-gray-600">Empresa</p>
                    <p className="font-medium">{landlord.companyName}</p>
                  </div>
                )}
                {landlord.monthlyIncome && (
                  <div>
                    <p className="text-sm text-gray-600">Ingreso Mensual</p>
                    <p className="font-medium">{formatCurrency(landlord.monthlyIncome)}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {landlord.documents && landlord.documents.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">
              Documentos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {landlord.documents.map((doc: any) => (
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