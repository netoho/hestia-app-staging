'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { RefreshCw } from 'lucide-react';
import { PropertyType } from "@/prisma/generated/prisma-client/enums";
import { propertyStepSchema, type PropertyStepData } from '@/lib/schemas/policy/wizard';
import { generatePolicyNumber } from '@/lib/utils/policy';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';

interface PropertyStepRHFProps {
  initialData: Partial<PropertyStepData>;
  onSave: (data: PropertyStepData) => Promise<void>;
  policyNumberValidation?: { isValid: boolean; error?: string };
  disabled?: boolean;
}

export default function PropertyStepRHF({
  initialData,
  onSave,
  policyNumberValidation,
  disabled = false,
}: PropertyStepRHFProps) {
  const form = useForm<PropertyStepData>({
    resolver: zodResolver(propertyStepSchema),
    mode: 'onChange',
    defaultValues: {
      policyNumber: generatePolicyNumber(),
      propertyType: PropertyType.APARTMENT,
      contractLength: 12,
      parkingSpaces: 0,
      isFurnished: false,
      hasPhone: false,
      hasElectricity: true,
      hasWater: true,
      hasGas: false,
      hasCableTV: false,
      hasInternet: false,
      utilitiesInLandlordName: false,
      hasIVA: false,
      issuesTaxReceipts: false,
      securityDeposit: 1,
      maintenanceIncludedInRent: false,
      paymentMethod: 'bank_transfer',
      hasInventory: false,
      hasRules: false,
      petsAllowed: false,
      ...initialData,
    },
  });

  const handleSubmit = async (data: PropertyStepData) => {
    await onSave(data);
  };

  const handleGeneratePolicyNumber = () => {
    form.setValue('policyNumber', generatePolicyNumber());
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Información de la Propiedad</CardTitle>
            <CardDescription>Ingrese los detalles de la propiedad a asegurar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Policy Number */}
            <FormField
              control={form.control}
              name="policyNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Número de Póliza</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        placeholder="POL-YYYYMMDD-XXX"
                        disabled={disabled}
                        className={policyNumberValidation?.isValid === false ? 'border-red-500' : ''}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleGeneratePolicyNumber}
                      disabled={disabled}
                      title="Generar nuevo número"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  {policyNumberValidation?.isValid === false && (
                    <p className="text-sm text-destructive">{policyNumberValidation.error}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Internal Code */}
            <FormField
              control={form.control}
              name="internalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel optional>Código Interno</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder="INV1, CONT 1, etc."
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Property Address */}
            <FormField
              control={form.control}
              name="propertyAddressDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Dirección de la Propiedad</FormLabel>
                  <FormControl>
                    <AddressAutocomplete
                      label=""
                      value={field.value || {}}
                      onChange={(addressData) => {
                        field.onChange(addressData);
                      }}
                      required
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Property Type */}
            <FormField
              control={form.control}
              name="propertyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Propiedad</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PropertyType.HOUSE}>Casa</SelectItem>
                      <SelectItem value={PropertyType.APARTMENT}>Departamento</SelectItem>
                      <SelectItem value={PropertyType.COMMERCIAL}>Local Comercial</SelectItem>
                      <SelectItem value={PropertyType.OFFICE}>Oficina</SelectItem>
                      <SelectItem value={PropertyType.WAREHOUSE}>Bodega</SelectItem>
                      <SelectItem value={PropertyType.OTHER}>Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rent and Deposit */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Renta Mensual</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        placeholder="0.00"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="depositAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Depósito</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        type="number"
                        placeholder="0.00"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contract Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Fecha de Inicio</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Fecha de Término</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contract Length */}
            <FormField
              control={form.control}
              name="contractLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel optional>Duración del Contrato (meses)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 12)}
                      placeholder="12"
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
