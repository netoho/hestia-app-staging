'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Calculator, RefreshCw, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/services/pricingService';
import { PricingFormData } from '../../types';

interface PricingStepProps {
  propertyData: any;
  pricingData: PricingFormData;
  packages: any[];
  packagesLoading: boolean;
  onUpdate: (data: Partial<PricingFormData>) => void;
  onCalculate: () => void;
  isCalculating: boolean;
  pricingResult: any;
  onNext: () => void;
  onPrevious: () => void;
}

export default function PricingStep({
  propertyData,
  pricingData,
  packages,
  packagesLoading,
  onUpdate,
  onCalculate,
  isCalculating,
  pricingResult,
  onNext,
  onPrevious,
}: PricingStepProps) {
  const handleTenantPercentageChange = (value: string) => {
    const percentage = parseFloat(value) || 0;
    if (percentage >= 0 && percentage <= 100) {
      onUpdate({
        tenantPercentage: percentage,
        landlordPercentage: 100 - percentage,
      });
    }
  };

  const handleLandlordPercentageChange = (value: string) => {
    const percentage = parseFloat(value) || 0;
    if (percentage >= 0 && percentage <= 100) {
      onUpdate({
        landlordPercentage: percentage,
        tenantPercentage: 100 - percentage,
      });
    }
  };

  const handleManualPriceChange = (value: string) => {
    const price = parseFloat(value) || 0;
    onUpdate({
      manualPrice: price,
      isManualOverride: true,
    });
  };

  const resetToCalculatedPrice = () => {
    if (pricingResult) {
      onUpdate({
        manualPrice: pricingResult.subtotal,
        isManualOverride: false,
      });
    }
  };

  const percentageSum = pricingData.tenantPercentage + pricingData.landlordPercentage;
  const percentageError = Math.abs(percentageSum - 100) > 0.01;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Precio</CardTitle>
        <CardDescription>Seleccione el paquete y configure la distribución del costo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Package Selection */}
        <div>
          <Label htmlFor="package" required>
            Paquete de Protección
          </Label>
          {packagesLoading ? (
            <div className="flex items-center justify-center p-4 border rounded-md">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              <span className="ml-2">Cargando paquetes...</span>
            </div>
          ) : packages.length > 0 ? (
            <>
              <Select
                value={pricingData.packageId}
                onValueChange={(value) => onUpdate({ packageId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un paquete" />
                </SelectTrigger>
                <SelectContent>
                  {packages.sort((a, b) => b.price - a.price).map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                      {pkg.percentage && ` - ${pkg.percentage}% de la renta`}
                      {pkg.price && !pkg.percentage && ` - ${formatCurrency(pkg.price)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pricingData.packageId && packages.find(p => p.id === pricingData.packageId) && (
                <p className="text-sm text-gray-500 mt-2">
                  {packages.find(p => p.id === pricingData.packageId)?.description}
                </p>
              )}
            </>
          ) : (
            <Alert>
              <AlertDescription>
                No hay paquetes disponibles. Por favor, contacta al administrador.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Calculate Button */}
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={onCalculate}
            disabled={!propertyData.rentAmount || !pricingData.packageId || isCalculating}
            variant="outline"
            size="lg"
          >
            {isCalculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
                Calculando...
              </>
            ) : (
              <>
                <Calculator className="mr-2 h-4 w-4" />
                Calcular Precio
              </>
            )}
          </Button>
        </div>

        {/* Pricing Result */}
        {pricingResult && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Resumen de Costos
            </h4>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Precio del Paquete:</span>
                <span className="font-medium">{formatCurrency(pricingResult.packagePrice)}</span>
              </div>

              {pricingResult.investigationFee && (
                <div className="flex justify-between">
                  <span>Cuota de Investigación:</span>
                  <span className="font-medium">{formatCurrency(pricingResult.investigationFee)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">{formatCurrency(pricingResult.subtotal)}</span>
              </div>

              <div className="flex justify-between">
                <span>IVA (16%):</span>
                <span className="font-medium">{formatCurrency(pricingResult.iva)}</span>
              </div>

              <div className="flex justify-between pt-2 border-t">
                <span className="font-medium">Total con IVA:</span>
                <span className="font-bold">{formatCurrency(pricingResult.totalWithIva)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Cost Distribution */}
        <div className="space-y-4">
          <Label>Distribución del Costo</Label>
          <div className="p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tenantPercentage">Porcentaje Inquilino</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="tenantPercentage"
                    type="number"
                    value={pricingData.tenantPercentage}
                    onChange={(e) => handleTenantPercentageChange(e.target.value)}
                    placeholder="100"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
              </div>
              <div>
                <Label htmlFor="landlordPercentage">Porcentaje Arrendador</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="landlordPercentage"
                    type="number"
                    value={pricingData.landlordPercentage}
                    onChange={(e) => handleLandlordPercentageChange(e.target.value)}
                    placeholder="0"
                    min="0"
                    max="100"
                  />
                  <span className="text-sm font-medium">%</span>
                </div>
              </div>
            </div>

            {percentageError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Los porcentajes deben sumar 100%. Actualmente suman {percentageSum}%
                </AlertDescription>
              </Alert>
            )}

            {pricingResult && (
              <div className="space-y-1 pt-2 border-t">
                <div className="flex justify-between text-blue-600">
                  <span>Pago Inquilino ({pricingData.tenantPercentage}%):</span>
                  <span className="font-medium">
                    {formatCurrency(pricingResult.totalWithIva * pricingData.tenantPercentage / 100)}
                  </span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Pago Arrendador ({pricingData.landlordPercentage}%):</span>
                  <span className="font-medium">
                    {formatCurrency(pricingResult.totalWithIva * pricingData.landlordPercentage / 100)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manual Price Override */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="manualOverride"
              checked={pricingData.isManualOverride}
              onCheckedChange={(checked) => onUpdate({ isManualOverride: checked as boolean })}
            />
            <Label htmlFor="manualOverride">Ajuste manual de precio</Label>
          </div>

          {pricingData.isManualOverride && (
            <div className="p-4 border rounded-lg space-y-4">
              <div>
                <Label htmlFor="manualPrice">Precio Base (sin IVA)</Label>
                <div className="flex gap-2">
                  <Input
                    id="manualPrice"
                    type="number"
                    value={pricingData.manualPrice || ''}
                    onChange={(e) => handleManualPriceChange(e.target.value)}
                    placeholder="0.00"
                  />
                  {pricingResult && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={resetToCalculatedPrice}
                      title="Restablecer al precio calculado"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {pricingData.manualPrice && (
                  <p className="text-sm text-gray-600 mt-2">
                    Total con IVA: {formatCurrency((pricingData.manualPrice || 0) * 1.16)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onPrevious}>
            Anterior
          </Button>
          <Button
            onClick={onNext}
            disabled={!pricingData.packageId || percentageError}
          >
            Siguiente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}