import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home } from 'lucide-react';

interface PropertyCardProps {
  propertyAddress: string;
  propertyType?: string;
  propertyDescription?: string;
  rentAmount: number;
  contractLength?: number;
}

export default function PropertyCard({
  propertyAddress,
  propertyType,
  propertyDescription,
  rentAmount,
  contractLength,
}: PropertyCardProps) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="h-5 w-5" />
          Información del Inmueble
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm text-gray-600">Dirección</p>
          <p className="font-medium">{propertyAddress}</p>
        </div>
        {propertyType && (
          <div>
            <p className="text-sm text-gray-600">Tipo de Propiedad</p>
            <p className="font-medium">{propertyType}</p>
          </div>
        )}
        {propertyDescription && (
          <div>
            <p className="text-sm text-gray-600">Descripción</p>
            <p className="font-medium">{propertyDescription}</p>
          </div>
        )}
        <div>
          <p className="text-sm text-gray-600">Renta Mensual</p>
          <p className="font-medium text-lg">{formatCurrency(rentAmount)}</p>
        </div>
        {contractLength && (
          <div>
            <p className="text-sm text-gray-600">Duración del Contrato</p>
            <p className="font-medium">{contractLength} meses</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}