'use client';

import { useForm } from 'react-hook-form';
import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Calculator, RefreshCw, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { pricingStepSchema, type PricingStepData } from '@/lib/schemas/policy/wizard';
import { TAX_CONFIG } from '@/lib/constants/businessConfig';
import { Button } from '@/components/ui/button';

interface PricingStepRHFProps {
  initialData: Partial<PricingStepData>;
  rentAmount: string;
  packages: any[];
  packagesLoading: boolean;
  onSave: (data: PricingStepData) => Promise<void>;
  onCalculate: (packageId: string) => void;
  isCalculating: boolean;
  pricingResult: any;
  disabled?: boolean;
}

export default function PricingStepRHF({
  initialData,
  rentAmount,
  packages,
  packagesLoading,
  onSave,
  onCalculate,
  isCalculating,
  pricingResult,
  disabled = false,
}: PricingStepRHFProps) {
  const form = useForm<PricingStepData>({
    resolver: zodResolver(pricingStepSchema),
    mode: 'onChange',
    defaultValues: {
      packageId: '',
      tenantPercentage: 100,
      landlordPercentage: 0,
      manualPrice: null,
      isManualOverride: false,
      calculatedPrice: null,
      ...initialData,
    },
  });

  const watchedPackageId = form.watch('packageId');
  const watchedTenantPercentage = form.watch('tenantPercentage');
  const watchedLandlordPercentage = form.watch('landlordPercentage');
  const watchedIsManualOverride = form.watch('isManualOverride');
  const watchedManualPrice = form.watch('manualPrice');

  // Track previous packageId to detect changes
  const prevPackageIdRef = useRef(watchedPackageId);

  // Auto-calculate when packageId changes
  useEffect(() => {
    if (
      watchedPackageId &&
      rentAmount &&
      watchedPackageId !== prevPackageIdRef.current
    ) {
      prevPackageIdRef.current = watchedPackageId;
      onCalculate(watchedPackageId);
    }
  }, [watchedPackageId, rentAmount, onCalculate]);

  // Update calculatedPrice when pricingResult changes
  useEffect(() => {
    if (pricingResult?.subtotal) {
      form.setValue('calculatedPrice', pricingResult.subtotal, { shouldValidate: true });
    }
  }, [pricingResult, form]);

  const handleSubmit = async (data: PricingStepData) => {
    await onSave(data);
  };

  const handleTenantPercentageChange = (value: number) => {
    if (value >= 0 && value <= 100) {
      form.setValue('tenantPercentage', value);
      form.setValue('landlordPercentage', 100 - value);
    }
  };

  const handleLandlordPercentageChange = (value: number) => {
    if (value >= 0 && value <= 100) {
      form.setValue('landlordPercentage', value);
      form.setValue('tenantPercentage', 100 - value);
    }
  };

  const resetToCalculatedPrice = () => {
    if (pricingResult) {
      form.setValue('manualPrice', pricingResult.subtotal);
      form.setValue('isManualOverride', false);
    }
  };

  const percentageSum = watchedTenantPercentage + watchedLandlordPercentage;
  const percentageError = Math.abs(percentageSum - 100) > 0.01;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Precio</CardTitle>
            <CardDescription>Seleccione el paquete y configure la distribución del costo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Package Selection */}
            <FormField
              control={form.control}
              name="packageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Paquete de Protección</FormLabel>
                  {packagesLoading ? (
                    <div className="flex items-center justify-center p-4 border rounded-md">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                      <span className="ml-2">Cargando paquetes...</span>
                    </div>
                  ) : packages.length > 0 ? (
                    <>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={disabled}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un paquete" />
                          </SelectTrigger>
                        </FormControl>
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
                      {field.value && packages.find(p => p.id === field.value) && (
                        <p className="text-sm text-gray-500 mt-2">
                          {packages.find(p => p.id === field.value)?.description}
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Auto-calculation status */}
            {isCalculating && (
              <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                <span className="text-blue-600">Calculando precio...</span>
              </div>
            )}

            {!rentAmount && watchedPackageId && (
              <Alert>
                <AlertDescription>
                  Regrese al paso anterior para ingresar el monto de renta
                </AlertDescription>
              </Alert>
            )}

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
              <FormLabel>Distribución del Costo</FormLabel>
              <div className="p-4 border rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tenantPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porcentaje Inquilino</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value}
                              onChange={(e) => handleTenantPercentageChange(parseFloat(e.target.value) || 0)}
                              placeholder="100"
                              min="0"
                              max="100"
                              disabled={disabled}
                            />
                          </FormControl>
                          <span className="text-sm font-medium">%</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="landlordPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Porcentaje Arrendador</FormLabel>
                        <div className="flex items-center gap-2">
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value}
                              onChange={(e) => handleLandlordPercentageChange(parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              min="0"
                              max="100"
                              disabled={disabled}
                            />
                          </FormControl>
                          <span className="text-sm font-medium">%</span>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                      <span>Pago Inquilino ({watchedTenantPercentage}%):</span>
                      <span className="font-medium">
                        {formatCurrency(pricingResult.totalWithIva * watchedTenantPercentage / 100)}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Pago Arrendador ({watchedLandlordPercentage}%):</span>
                      <span className="font-medium">
                        {formatCurrency(pricingResult.totalWithIva * watchedLandlordPercentage / 100)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Manual Price Override */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="isManualOverride"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">Ajuste manual de precio</FormLabel>
                  </FormItem>
                )}
              />

              {watchedIsManualOverride && (
                <div className="p-4 border rounded-lg space-y-4">
                  <FormField
                    control={form.control}
                    name="manualPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio Base (sin IVA)</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              type="number"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || null)}
                              placeholder="0.00"
                              disabled={disabled}
                            />
                          </FormControl>
                          {pricingResult && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={resetToCalculatedPrice}
                              title="Restablecer al precio calculado"
                              disabled={disabled}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {watchedManualPrice && (
                          <p className="text-sm text-gray-600 mt-2">
                            Total con IVA: {formatCurrency((watchedManualPrice || 0) * (1 + TAX_CONFIG.IVA_RATE))}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
