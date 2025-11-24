'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { formatCurrency } from '@/lib/services/pricingService';
import { formatFullName } from '@/lib/utils/names';
import { GuarantorType, TenantType } from '@/lib/enums';
import { PolicyCreationFormData } from '../../types';

interface ReviewStepProps {
  formData: PolicyCreationFormData;
  packages: any[];
  pricingResult: any;
  sendInvitations: boolean;
  onSetSendInvitations: (send: boolean) => void;
  onSubmit: () => void;
  onPrevious: () => void;
  isSubmitting: boolean;
}

export default function ReviewStep({
  formData,
  packages,
  pricingResult,
  sendInvitations,
  onSetSendInvitations,
  onSubmit,
  onPrevious,
  isSubmitting,
}: ReviewStepProps) {
  const selectedPackage = packages.find(p => p.id === formData.pricing.packageId);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revisar y Confirmar</CardTitle>
        <CardDescription>Verifique que todos los datos sean correctos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Property Summary */}
        <div>
          <h3 className="font-medium mb-2">Propiedad</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Número de Póliza:</dt>
              <dd className="font-medium">{formData.property.policyNumber}</dd>
            </div>
            {formData.property.internalCode && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Código Interno:</dt>
                <dd>{formData.property.internalCode}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Dirección:</dt>
              <dd>{formData.property.propertyAddress}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tipo:</dt>
              <dd>{formData.property.propertyType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Renta:</dt>
              <dd>{formatCurrency(parseFloat(formData.property.rentAmount || '0'))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Depósito:</dt>
              <dd>{formatCurrency(parseFloat(formData.property.depositAmount || formData.property.rentAmount || '0'))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Duración:</dt>
              <dd>{formData.property.contractLength} meses</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Período:</dt>
              <dd>{formData.property.startDate} - {formData.property.endDate}</dd>
            </div>
          </dl>
        </div>

        {/* Pricing Summary */}
        <div>
          <h3 className="font-medium mb-2">Paquete y Precio</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Paquete:</dt>
              <dd>{selectedPackage?.name || 'No seleccionado'}</dd>
            </div>
            {pricingResult && (
              <>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Subtotal:</dt>
                  <dd>{formatCurrency(pricingResult.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">IVA (16%):</dt>
                  <dd>{formatCurrency(pricingResult.iva)}</dd>
                </div>
                <div className="flex justify-between font-medium">
                  <dt>Total con IVA:</dt>
                  <dd>{formatCurrency(pricingResult.totalWithIva)}</dd>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-blue-600">
                    <dt className="text-gray-500">Pago Inquilino ({formData.pricing.tenantPercentage}%):</dt>
                    <dd>{formatCurrency(pricingResult.totalWithIva * formData.pricing.tenantPercentage / 100)}</dd>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <dt className="text-gray-500">Pago Arrendador ({formData.pricing.landlordPercentage}%):</dt>
                    <dd>{formatCurrency(pricingResult.totalWithIva * formData.pricing.landlordPercentage / 100)}</dd>
                  </div>
                </div>
                {formData.pricing.isManualOverride && (
                  <div className="flex justify-between text-orange-600">
                    <dt className="text-gray-500">Precio ajustado manualmente</dt>
                    <dd>✓</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>

        {/* Landlord Summary */}
        <div>
          <h3 className="font-medium mb-2">Arrendador</h3>
          <dl className="space-y-1 text-sm">
            {formData.landlord.isCompany ? (
              <>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Empresa:</dt>
                  <dd>{formData.landlord.companyName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">RFC:</dt>
                  <dd>{formData.landlord.companyRfc}</dd>
                </div>
                {formData.landlord.legalRepName && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Representante:</dt>
                    <dd>{formData.landlord.legalRepName}</dd>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between">
                <dt className="text-gray-500">Nombre:</dt>
                <dd>{formatFullName(
                  formData.landlord.firstName || '',
                  formData.landlord.paternalLastName || '',
                  formData.landlord.maternalLastName || '',
                  formData.landlord.middleName
                )}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Email:</dt>
              <dd>{formData.landlord.email}</dd>
            </div>
            {formData.landlord.phone && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Teléfono:</dt>
                <dd>{formData.landlord.phone}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Tenant Summary */}
        <div>
          <h3 className="font-medium mb-2">Inquilino</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Tipo:</dt>
              <dd>{formData.tenant.tenantType === TenantType.INDIVIDUAL ? 'Persona Física' : 'Persona Moral'}</dd>
            </div>
            {formData.tenant.tenantType === TenantType.COMPANY && formData.tenant.companyName && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Empresa:</dt>
                <dd>{formData.tenant.companyName}</dd>
              </div>
            )}
            {(formData.tenant.tenantType === TenantType.INDIVIDUAL ||
              (formData.tenant.tenantType === TenantType.COMPANY && formData.tenant.firstName)) && (
              <div className="flex justify-between">
                <dt className="text-gray-500">
                  {formData.tenant.tenantType === TenantType.COMPANY ? 'Representante:' : 'Nombre:'}
                </dt>
                <dd>{formatFullName(
                  formData.tenant.firstName,
                  formData.tenant.paternalLastName,
                  formData.tenant.maternalLastName,
                  formData.tenant.middleName
                )}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Email:</dt>
              <dd>{formData.tenant.email}</dd>
            </div>
            {formData.tenant.phone && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Teléfono:</dt>
                <dd>{formData.tenant.phone}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Guarantors Summary */}
        {formData.guarantorType !== GuarantorType.NONE && (
          <div>
            <h3 className="font-medium mb-2">Garantías</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Tipo de Garantía:</dt>
                <dd>
                  {formData.guarantorType === GuarantorType.JOINT_OBLIGOR && 'Obligado Solidario'}
                  {formData.guarantorType === GuarantorType.AVAL && 'Aval'}
                  {formData.guarantorType === GuarantorType.BOTH && 'Obligado Solidario y Aval'}
                </dd>
              </div>

              {formData.jointObligors.length > 0 && (
                <div>
                  <dt className="text-gray-500 mb-1">Obligados Solidarios:</dt>
                  <ul className="ml-4 space-y-1">
                    {formData.jointObligors.map((jo, index) => (
                      <li key={index} className="text-xs">
                        • {formatFullName(jo.firstName, jo.paternalLastName, jo.maternalLastName, jo.middleName)} - {jo.email}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {formData.avals.length > 0 && (
                <div>
                  <dt className="text-gray-500 mb-1">Avales:</dt>
                  <ul className="ml-4 space-y-1">
                    {formData.avals.map((aval, index) => (
                      <li key={index} className="text-xs">
                        • {formatFullName(aval.firstName, aval.paternalLastName, aval.maternalLastName, aval.middleName)} - {aval.email}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Send Invitations Option */}
        <div className="border-t pt-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="sendInvitations"
              checked={sendInvitations}
              onCheckedChange={(checked) => onSetSendInvitations(checked as boolean)}
            />
            <div className="space-y-1">
              <Label
                htmlFor="sendInvitations"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
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
          <Button variant="outline" onClick={onPrevious} disabled={isSubmitting}>
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