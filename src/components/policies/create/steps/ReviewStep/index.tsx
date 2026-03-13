'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatFullName } from '@/lib/utils/names';
import { GuarantorType, TenantType } from "@/prisma/generated/prisma-client/enums";
import { t } from '@/lib/i18n';
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
        <CardTitle>{t.pages.createPolicy.steps.review.title}</CardTitle>
        <CardDescription>{t.pages.createPolicy.steps.review.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Property Summary */}
        <div>
          <h3 className="font-medium mb-2">{t.pages.createPolicy.steps.review.sections.property}</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.policyNumber}</dt>
              <dd className="font-medium">{formData.property.policyNumber}</dd>
            </div>
            {formData.property.internalCode && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.internalCode}</dt>
                <dd>{formData.property.internalCode}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.address}</dt>
              <dd>
                {formData.property.propertyAddressDetails?.formattedAddress ||
                 (formData.property.propertyAddressDetails?.street
                   ? `${formData.property.propertyAddressDetails.street} ${formData.property.propertyAddressDetails.exteriorNumber || ''}, ${formData.property.propertyAddressDetails.neighborhood || ''}, ${formData.property.propertyAddressDetails.city || ''}`
                   : t.pages.createPolicy.steps.review.labels.notSpecified)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.type}</dt>
              <dd>{formData.property.propertyType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.rent}</dt>
              <dd>{formatCurrency(parseFloat(formData.property.rentAmount || '0'))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.deposit}</dt>
              <dd>{formatCurrency(parseFloat(formData.property.depositAmount || formData.property.rentAmount || '0'))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.duration}</dt>
              <dd>{formData.property.contractLength} {t.pages.createPolicy.steps.review.labels.months}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.period}</dt>
              <dd>{formData.property.startDate} - {formData.property.endDate}</dd>
            </div>
          </dl>
        </div>

        {/* Pricing Summary */}
        <div>
          <h3 className="font-medium mb-2">{t.pages.createPolicy.steps.review.sections.packageAndPrice}</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.package}</dt>
              <dd>{selectedPackage?.name || t.pages.createPolicy.steps.review.labels.notSelected}</dd>
            </div>
            {pricingResult && (
              <>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.subtotal}</dt>
                  <dd>{formatCurrency(pricingResult.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.iva}</dt>
                  <dd>{formatCurrency(pricingResult.iva)}</dd>
                </div>
                <div className="flex justify-between font-medium">
                  <dt>{t.pages.createPolicy.steps.review.labels.totalWithIva}</dt>
                  <dd>{formatCurrency(pricingResult.totalWithIva)}</dd>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-blue-600">
                    <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.tenantPayment(formData.pricing.tenantPercentage)}</dt>
                    <dd>{formatCurrency(pricingResult.totalWithIva * formData.pricing.tenantPercentage / 100)}</dd>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.landlordPayment(formData.pricing.landlordPercentage)}</dt>
                    <dd>{formatCurrency(pricingResult.totalWithIva * formData.pricing.landlordPercentage / 100)}</dd>
                  </div>
                </div>
                {formData.pricing.isManualOverride && (
                  <div className="flex justify-between text-orange-600">
                    <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.manuallyAdjusted}</dt>
                    <dd>✓</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>

        {/* Landlord Summary */}
        <div>
          <h3 className="font-medium mb-2">{t.pages.createPolicy.steps.review.sections.landlord}</h3>
          <dl className="space-y-1 text-sm">
            {formData.landlord.isCompany ? (
              <>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.company}</dt>
                  <dd>{formData.landlord.companyName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.rfc}</dt>
                  <dd>{formData.landlord.companyRfc}</dd>
                </div>
                {formData.landlord.legalRepName && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.representative}</dt>
                    <dd>{formData.landlord.legalRepName}</dd>
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.name}</dt>
                <dd>{formatFullName(
                  formData.landlord.firstName || '',
                  formData.landlord.paternalLastName || '',
                  formData.landlord.maternalLastName || '',
                  formData.landlord.middleName
                )}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.email}</dt>
              <dd>{formData.landlord.email}</dd>
            </div>
            {formData.landlord.phone && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.phone}</dt>
                <dd>{formData.landlord.phone}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Tenant Summary */}
        <div>
          <h3 className="font-medium mb-2">{t.pages.createPolicy.steps.review.sections.tenant}</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.tenantType}</dt>
              <dd>{formData.tenant.tenantType === TenantType.INDIVIDUAL ? t.pages.createPolicy.steps.review.labels.individual : t.pages.createPolicy.steps.review.labels.companyType}</dd>
            </div>
            {formData.tenant.tenantType === TenantType.COMPANY && formData.tenant.companyName && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.company}</dt>
                <dd>{formData.tenant.companyName}</dd>
              </div>
            )}
            {(formData.tenant.tenantType === TenantType.INDIVIDUAL ||
              (formData.tenant.tenantType === TenantType.COMPANY && formData.tenant.firstName)) && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {formData.tenant.tenantType === TenantType.COMPANY ? t.pages.createPolicy.steps.review.labels.representative : t.pages.createPolicy.steps.review.labels.name}
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
              <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.email}</dt>
              <dd>{formData.tenant.email}</dd>
            </div>
            {formData.tenant.phone && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.phone}</dt>
                <dd>{formData.tenant.phone}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Guarantors Summary */}
        {formData.guarantorType !== GuarantorType.NONE && (
          <div>
            <h3 className="font-medium mb-2">{t.pages.createPolicy.steps.review.sections.guarantees}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t.pages.createPolicy.steps.review.labels.guaranteeType}</dt>
                <dd>
                  {formData.guarantorType === GuarantorType.JOINT_OBLIGOR && t.pages.createPolicy.steps.review.labels.jointObligor}
                  {formData.guarantorType === GuarantorType.AVAL && t.pages.createPolicy.steps.review.labels.aval}
                  {formData.guarantorType === GuarantorType.BOTH && t.pages.createPolicy.steps.review.labels.jointObligorAndAval}
                </dd>
              </div>

              {formData.jointObligors.length > 0 && (
                <div>
                  <dt className="text-muted-foreground mb-1">{t.pages.createPolicy.steps.review.labels.jointObligors}</dt>
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
                  <dt className="text-muted-foreground mb-1">{t.pages.createPolicy.steps.review.labels.avals}</dt>
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
                {t.pages.createPolicy.steps.review.autoInvite}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t.pages.createPolicy.steps.review.autoInviteDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onPrevious} disabled={isSubmitting}>
            {t.pages.createPolicy.navigation.previous}
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? t.pages.createPolicy.navigation.creating : t.pages.createPolicy.navigation.create}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
