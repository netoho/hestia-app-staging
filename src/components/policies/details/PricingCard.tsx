import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

interface PricingCardProps {
  package?: {
    id: string;
    name: string;
    price: number;
    features?: string;
  };
  totalPrice: number;
  tenantPercentage?: number;
  landlordPercentage?: number;
  guarantorType: string;
}

export default function PricingCard({
  package: packageData,
  totalPrice,
  tenantPercentage,
  landlordPercentage,
  guarantorType,
}: PricingCardProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX')}`;
  };

  const getGuarantorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      NONE: 'Sin garantías',
      JOINT_OBLIGOR: 'Obligado Solidario',
      AVAL: 'Aval',
      BOTH: 'Obligado Solidario y Aval',
    };
    return labels[type] || type;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Plan y Precio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {packageData && (
          <div>
            <p className="text-sm text-gray-600">Plan Seleccionado</p>
            <p className="font-medium">{packageData.name}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-gray-600">Precio Total</p>
          <p className="font-medium text-lg text-green-600">{formatCurrency(totalPrice)}</p>
        </div>
        {tenantPercentage !== undefined && landlordPercentage !== undefined && (
          <div>
            <p className="text-sm text-gray-600">División del Pago</p>
            <div className="flex justify-between mt-1">
              <span className="text-sm">Inquilino: {tenantPercentage}%</span>
              <span className="text-sm">Arrendador: {landlordPercentage}%</span>
            </div>
            <div className="flex gap-1 mt-2">
              <div
                className="h-2 bg-blue-500 rounded-l"
                style={{ width: `${tenantPercentage}%` }}
              />
              <div
                className="h-2 bg-green-500 rounded-r"
                style={{ width: `${landlordPercentage}%` }}
              />
            </div>
          </div>
        )}
        <div>
          <p className="text-sm text-gray-600">Tipo de Garantía</p>
          <p className="font-medium">{getGuarantorTypeLabel(guarantorType)}</p>
        </div>
      </CardContent>
    </Card>
  );
}