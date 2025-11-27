'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { propertyDetailsSchema } from '@/lib/schemas/shared/property.schema';

// Helper to format date for HTML date input (YYYY-MM-DD)
const formatDateForInput = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

interface PropertyDetailsFormRHFProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

export default function PropertyDetailsFormRHF({
  initialData,
  onSave,
  disabled = false,
}: PropertyDetailsFormRHFProps) {
  const form = useForm({
    resolver: zodResolver(propertyDetailsSchema as any),
    mode: 'onChange',
    defaultValues: {
      // Addresses
      propertyAddressDetails: initialData?.propertyAddressDetails || {},
      contractSigningAddressDetails: initialData?.contractSigningAddressDetails || {},
      // Parking
      parkingSpaces: initialData?.parkingSpaces || 0,
      parkingNumbers: initialData?.parkingNumbers || '',
      // Utilities
      hasElectricity: initialData?.hasElectricity ?? true,
      hasWater: initialData?.hasWater ?? true,
      hasGas: initialData?.hasGas ?? false,
      hasPhone: initialData?.hasPhone ?? false,
      hasCableTV: initialData?.hasCableTV ?? false,
      hasInternet: initialData?.hasInternet ?? false,
      otherServices: initialData?.otherServices || '',
      utilitiesInLandlordName: initialData?.utilitiesInLandlordName ?? false,
      // Features
      isFurnished: initialData?.isFurnished ?? false,
      petsAllowed: initialData?.petsAllowed ?? false,
      hasInventory: initialData?.hasInventory ?? false,
      hasRules: initialData?.hasRules ?? false,
      rulesType: initialData?.rulesType || null,
      // Dates (format Date objects to YYYY-MM-DD strings for HTML input)
      propertyDeliveryDate: formatDateForInput(initialData?.propertyDeliveryDate),
      contractSigningDate: formatDateForInput(initialData?.contractSigningDate),
    },
  });

  const hasRules = form.watch('hasRules');

  const handleSubmit = async (data: any) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Property Characteristics */}
        <Card>
          <CardHeader>
            <CardTitle>Características de la Propiedad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Parking Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Estacionamiento</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="parkingSpaces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel optional>Número de Espacios</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                          min="0"
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parkingNumbers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel optional>Números de Cajones</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          placeholder="Ej: 101, 102"
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Services Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium">Servicios Incluidos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="hasElectricity"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Electricidad</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasWater"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Agua</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasGas"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Gas</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasPhone"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Teléfono</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasCableTV"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">TV por Cable</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasInternet"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Internet</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="utilitiesInLandlordName"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="font-normal">Servicios a nombre del arrendador</FormLabel>
                      <FormDescription>
                        Los contratos de servicios están a nombre del propietario
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="otherServices"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Otros Servicios</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Otros servicios incluidos"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Features Section */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-medium">Características Adicionales</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isFurnished"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Amueblado</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="petsAllowed"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Se Permiten Mascotas</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasInventory"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Incluye Inventario</FormLabel>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasRules"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            // Clear rulesType when hasRules is unchecked
                            if (!checked) {
                              form.setValue('rulesType', null);
                            }
                          }}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">Tiene Reglamento</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {/* Rules Type Dropdown - shown when hasRules is true */}
              {hasRules && (
                <FormField
                  control={form.control}
                  name="rulesType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Reglamento</FormLabel>
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        disabled={disabled}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona el tipo de reglamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CONDOMINOS">Condóminos</SelectItem>
                          <SelectItem value="COLONOS">Colonos</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Important Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Fechas Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="propertyDeliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Fecha de Entrega de la Propiedad</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ''}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractSigningDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Fecha de Firma del Contrato</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        value={field.value || ''}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="contractSigningAddressDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel optional>Lugar de Firma del Contrato</FormLabel>
                  <FormControl>
                    <AddressAutocomplete
                      label=""
                      value={field.value || {}}
                      onChange={(addressData) => {
                        field.onChange(addressData);
                      }}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormDescription>
                    Dirección donde se firmará el contrato
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Property Location */}
        <Card>
          <CardHeader>
            <CardTitle>Ubicación de la Propiedad</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
