import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Home, Edit } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface PropertyDetailsData {
  parkingSpaces?: number | null;
  parkingNumbers?: string | null;
  isFurnished?: boolean;
  hasPhone?: boolean;
  hasElectricity?: boolean;
  hasWater?: boolean;
  hasGas?: boolean;
  hasCableTV?: boolean;
  hasInternet?: boolean;
  otherServices?: string | null;
  utilitiesInLandlordName?: boolean;
  hasInventory?: boolean;
  hasRules?: boolean;
  petsAllowed?: boolean;
  propertyDeliveryDate?: Date | string | null;
  contractSigningDate?: Date | string | null;
  contractSigningLocation?: string | null;
  propertyAddressDetails?: any;
}

interface PolicyFinancialData {
  hasIVA?: boolean;
  issuesTaxReceipts?: boolean;
  securityDeposit?: number | null;
  maintenanceFee?: number | null;
  maintenanceIncludedInRent?: boolean;
  rentIncreasePercentage?: number | null;
  paymentMethod?: string | null;
}

interface PropertyCardProps {
  propertyAddress: string;
  propertyType?: string;
  propertyDescription?: string;
  rentAmount: number;
  contractLength?: number;
  propertyDetails?: PropertyDetailsData | null;
  policyFinancialData?: PolicyFinancialData | null;
  policyId?: string;
}

export default function PropertyCard({
  propertyAddress,
  propertyType,
  propertyDescription,
  rentAmount,
  contractLength,
  propertyDetails,
  policyFinancialData,
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

        {/* Property Details Section */}
        {propertyDetails && (
          <>
            {/* Property Features */}
            <div className="pt-3 border-t">
              <p className="text-sm font-semibold mb-2">Características</p>
              <div className="grid grid-cols-2 gap-2">
                {propertyDetails.isFurnished !== undefined && (
                  <p className="text-sm">
                    <span className="text-gray-600">Amueblado:</span> {propertyDetails.isFurnished ? 'Sí' : 'No'}
                  </p>
                )}
                {propertyDetails.parkingSpaces !== undefined && propertyDetails.parkingSpaces !== null && (
                  <p className="text-sm">
                    <span className="text-gray-600">Estacionamientos:</span> {propertyDetails.parkingSpaces}
                  </p>
                )}
                {propertyDetails.petsAllowed !== undefined && (
                  <p className="text-sm">
                    <span className="text-gray-600">Mascotas:</span> {propertyDetails.petsAllowed ? 'Sí' : 'No'}
                  </p>
                )}
              </div>
            </div>

            {/* Services */}
            {(propertyDetails.hasElectricity || propertyDetails.hasWater || propertyDetails.hasGas ||
              propertyDetails.hasInternet || propertyDetails.hasCableTV || propertyDetails.hasPhone) && (
              <div className="pt-3 border-t">
                <p className="text-sm font-semibold mb-2">Servicios Incluidos</p>
                <div className="grid grid-cols-2 gap-2">
                  {propertyDetails.hasElectricity && <p className="text-sm">✓ Electricidad</p>}
                  {propertyDetails.hasWater && <p className="text-sm">✓ Agua</p>}
                  {propertyDetails.hasGas && <p className="text-sm">✓ Gas</p>}
                  {propertyDetails.hasInternet && <p className="text-sm">✓ Internet</p>}
                  {propertyDetails.hasCableTV && <p className="text-sm">✓ Cable TV</p>}
                  {propertyDetails.hasPhone && <p className="text-sm">✓ Teléfono</p>}
                </div>
              </div>
            )}

            {/* Financial Details - Now from policyFinancialData */}
            {policyFinancialData && (policyFinancialData.securityDeposit || policyFinancialData.maintenanceFee) && (
              <div className="pt-3 border-t">
                <p className="text-sm font-semibold mb-2">Detalles Financieros</p>
                {policyFinancialData.securityDeposit !== undefined && policyFinancialData.securityDeposit !== null && (
                  <p className="text-sm">
                    <span className="text-gray-600">Depósito:</span> {policyFinancialData.securityDeposit} mes(es)
                  </p>
                )}
                {policyFinancialData.maintenanceFee !== undefined && policyFinancialData.maintenanceFee !== null && (
                  <p className="text-sm">
                    <span className="text-gray-600">Mantenimiento:</span> {formatCurrency(policyFinancialData.maintenanceFee)}
                    {policyFinancialData.maintenanceIncludedInRent && ' (incluido en renta)'}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}