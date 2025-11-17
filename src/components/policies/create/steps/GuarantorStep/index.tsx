'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function GuarantorStep({
  guarantorType,
  jointObligors,
  avals,
  onSetGuarantorType,
  onAddJointObligor,
  onRemoveJointObligor,
  onUpdateJointObligor,
  onAddAval,
  onRemoveAval,
  onUpdateAval,
  onNext,
  onPrevious,
}: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Obligado S. / Aval</CardTitle>
        <CardDescription>Añada info de Obligado o Aval</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Guarantor step - To be implemented</p>
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onPrevious}>Anterior</Button>
          <Button onClick={onNext}>Siguiente</Button>
        </div>
      </CardContent>
    </Card>
  );
}