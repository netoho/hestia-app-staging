'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';

export default function ReviewStep({
  formData,
  packages,
  pricingResult,
  sendInvitations,
  onSetSendInvitations,
  onSubmit,
  onPrevious,
  isSubmitting,
}: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revisar y Confirmar</CardTitle>
        <CardDescription>Verifique que todos los datos sean correctos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-2">Resumen de la Póliza</h3>
          <p className="text-sm text-gray-600">
            Revise los detalles antes de crear la protección
          </p>
        </div>

        {/* Send Invitations Checkbox */}
        <div className="border-t pt-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="sendInvitations"
              checked={sendInvitations}
              onCheckedChange={(checked) => onSetSendInvitations(checked as boolean)}
            />
            <div className="space-y-1">
              <Label htmlFor="sendInvitations" className="text-sm font-medium cursor-pointer">
                <Mail className="inline h-4 w-4 mr-1" />
                Enviar invitaciones automáticamente
              </Label>
              <p className="text-sm text-gray-500">
                Se enviarán invitaciones por correo a los actores para que completen su información
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrevious}>
            Anterior
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creando...' : 'Crear Protección'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}