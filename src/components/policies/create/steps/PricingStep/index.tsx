'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
}: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de Precio</CardTitle>
        <CardDescription>Seleccione el paquete y configure la distribución del costo</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Pricing step - To be implemented</p>
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onPrevious}>Anterior</Button>
          <Button onClick={onNext}>Siguiente</Button>
        </div>
      </CardContent>
    </Card>
  );
}