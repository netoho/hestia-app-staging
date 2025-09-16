import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Edit } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface PropertyCardProps {
  propertyAddress: string;
  propertyType?: string;
  propertyDescription?: string;
  rentAmount: number;
  contractLength?: number;
  policyId?: string;
}

export default function PropertyCard({
  propertyAddress,
  propertyType,
  propertyDescription,
  rentAmount,
  contractLength,
  policyId,
}: PropertyCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isStaffOrAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'STAFF';
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-MX')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Información del Inmueble
          </div>
          {isStaffOrAdmin && policyId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/dashboard/policies/${policyId}/property`)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
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