import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, FileText, CheckCircle2 } from 'lucide-react';

interface TenantCardProps {
  tenant: any;
  policyId: string;
}

export default function TenantCard({ tenant, policyId }: TenantCardProps) {
  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return `$${amount.toLocaleString('es-MX')}`;
  };

  if (!tenant) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No se ha capturado información del inquilino</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Información del Inquilino
          </div>
          {tenant.informationComplete ? (
            <Badge className="bg-green-500 text-white">Completo</Badge>
          ) : (
            <Badge className="bg-orange-500 text-white">Pendiente</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">
              Información Personal
            </h3>
            {tenant.tenantType && (
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <Badge variant="outline">
                  {tenant.tenantType === 'COMPANY' ? 'Empresa' : 'Persona Física'}
                </Badge>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Nombre</p>
              <p className="font-medium">
                {tenant.fullName || tenant.companyName || 'Sin nombre'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {tenant.email}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Teléfono</p>
              <p className="font-medium flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {tenant.phone}
              </p>
            </div>
            {tenant.nationality && (
              <div>
                <p className="text-sm text-gray-600">Nacionalidad</p>
                <p className="font-medium">
                  {tenant.nationality === 'MEXICAN' ? 'Mexicana' : 'Extranjera'}
                </p>
              </div>
            )}
            {tenant.curp && (
              <div>
                <p className="text-sm text-gray-600">CURP</p>
                <p className="font-medium font-mono">{tenant.curp}</p>
              </div>
            )}
            {tenant.passport && (
              <div>
                <p className="text-sm text-gray-600">Pasaporte</p>
                <p className="font-medium">{tenant.passport}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {tenant.employmentStatus && (
              <>
                <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider">
                  Información Laboral
                </h3>
                <div>
                  <p className="text-sm text-gray-600">Situación Laboral</p>
                  <p className="font-medium">{tenant.employmentStatus}</p>
                </div>
                {tenant.occupation && (
                  <div>
                    <p className="text-sm text-gray-600">Ocupación</p>
                    <p className="font-medium">{tenant.occupation}</p>
                  </div>
                )}
                {tenant.monthlyIncome && (
                  <div>
                    <p className="text-sm text-gray-600">Ingreso Mensual</p>
                    <p className="font-medium">{formatCurrency(tenant.monthlyIncome)}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {tenant.references && tenant.references.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">
              Referencias Personales
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {tenant.references.map((ref: any, index: number) => (
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

        {tenant.documents && tenant.documents.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wider mb-3">
              Documentos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {tenant.documents.map((doc: any) => (
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