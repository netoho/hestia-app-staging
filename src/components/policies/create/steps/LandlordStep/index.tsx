'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LandlordStep({ data, onUpdate, onNext, onPrevious }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Información del Arrendador</CardTitle>
        <CardDescription>Ingrese los datos del propietario</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Landlord step - To be implemented</p>
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onPrevious}>Anterior</Button>
          <Button onClick={onNext}>Siguiente</Button>
        </div>
      </CardContent>
    </Card>
  );
}