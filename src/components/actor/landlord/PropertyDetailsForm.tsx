'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyDetails } from '@/lib/types/actor';
import {
  PropertyAddressSection,
  PropertyParkingSection,
  PropertyServicesSection,
  PropertyFeaturesSection,
  PropertyDatesSection,
} from '@/components/forms/property';

interface PropertyDetailsFormProps {
  data: Partial<PropertyDetails>;
  onChange: (field: keyof PropertyDetails, value: any) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export default function PropertyDetailsForm({
  data,
  onChange,
  errors = {},
  disabled = false,
}: PropertyDetailsFormProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ubicación de la Propiedad</CardTitle>
        </CardHeader>
        <CardContent>
          <PropertyAddressSection
            value={data.propertyAddressDetails}
            onChange={(addressData) => onChange('propertyAddressDetails', addressData)}
            required
            disabled={disabled}
            error={errors.propertyAddressDetails}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Características de la Propiedad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PropertyParkingSection
            parkingSpaces={data.parkingSpaces}
            parkingNumbers={data.parkingNumbers}
            onParkingSpacesChange={(value) => onChange('parkingSpaces', value)}
            onParkingNumbersChange={(value) => onChange('parkingNumbers', value)}
            disabled={disabled}
            errors={errors}
          />

          <PropertyServicesSection
            hasElectricity={data.hasElectricity}
            hasWater={data.hasWater}
            hasGas={data.hasGas}
            hasPhone={data.hasPhone}
            hasCableTV={data.hasCableTV}
            hasInternet={data.hasInternet}
            utilitiesInLandlordName={data.utilitiesInLandlordName}
            onChange={onChange}
            disabled={disabled}
          />

          <PropertyFeaturesSection
            isFurnished={data.isFurnished}
            petsAllowed={data.petsAllowed}
            hasInventory={data.hasInventory}
            hasRules={data.hasRules}
            rulesType={data.rulesType}
            onChange={onChange}
            disabled={disabled}
            errors={errors}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fechas Importantes</CardTitle>
        </CardHeader>
        <CardContent>
          <PropertyDatesSection
            propertyDeliveryDate={data.propertyDeliveryDate}
            contractSigningDate={data.contractSigningDate}
            contractSigningLocation={data.contractSigningLocation}
            onChange={onChange}
            disabled={disabled}
            errors={errors}
          />
        </CardContent>
      </Card>
    </>
  );
}
