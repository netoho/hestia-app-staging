'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { getTenantTabSchema } from '@/lib/schemas/tenant';

interface TenantRentalHistoryTabProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

export default function TenantRentalHistoryTabRHF({
  initialData,
  onSave,
  disabled = false,
}: TenantRentalHistoryTabProps) {
  // Rental history tab is only for INDIVIDUAL tenants
  const schema = getTenantTabSchema('INDIVIDUAL', 'rental');

  const form = useForm({
    resolver: zodResolver(schema as any),
    mode: 'onChange',
    defaultValues: {
      previousLandlordName: initialData?.previousLandlordName || '',
      previousLandlordPhone: initialData?.previousLandlordPhone || '',
      previousLandlordEmail: initialData?.previousLandlordEmail || '',
      previousRentAmount: initialData?.previousRentAmount || null,
      previousRentalAddressDetails: initialData?.previousRentalAddressDetails || {},
      rentalHistoryYears: initialData?.rentalHistoryYears || null,
      reasonForMoving: initialData?.reasonForMoving || '',
      numberOfOccupants: initialData?.numberOfOccupants || null,
      hasPets: initialData?.hasPets || false,
      petDescription: initialData?.petDescription || '',
    },
  });

  const hasPets = form.watch('hasPets');

  const handleSubmit = async (data: any) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Historial de Renta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Si es su primera vez rentando, puede dejar estos campos vacíos.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Previous Landlord Name */}
              <FormField
                control={form.control}
                name="previousLandlordName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Nombre del Arrendador Anterior</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Nombre completo"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Previous Landlord Phone */}
              <FormField
                control={form.control}
                name="previousLandlordPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Teléfono del Arrendador Anterior</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="10 dígitos"
                        maxLength={10}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Previous Landlord Email */}
              <FormField
                control={form.control}
                name="previousLandlordEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Email del Arrendador Anterior</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        value={field.value || ''}
                        placeholder="correo@ejemplo.com"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Previous Rent Amount */}
              <FormField
                control={form.control}
                name="previousRentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Renta Mensual Anterior (MXN)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        placeholder="0.00"
                        min="0"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Rental History Years */}
              <FormField
                control={form.control}
                name="rentalHistoryYears"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Años de Historial de Renta</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="0"
                        min="0"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Number of Occupants */}
              <FormField
                control={form.control}
                name="numberOfOccupants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Número de Ocupantes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="1"
                        min="1"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Previous Rental Address */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="previousRentalAddressDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel optional>Dirección de Renta Anterior</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          label=""
                          value={field.value || {}}
                          onChange={(addressData) => {
                            field.onChange(addressData);
                            form.setValue('previousRentalAddress',
                              `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                            );
                          }}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Reason for Moving */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="reasonForMoving"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel optional>Motivo de Cambio</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ''}
                          placeholder="¿Por qué se muda?"
                          disabled={disabled}
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pets Section */}
        <Card>
          <CardHeader>
            <CardTitle>Mascotas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="hasPets"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>¿Tiene mascotas?</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {hasPets && (
              <FormField
                control={form.control}
                name="petDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Descripción de Mascotas</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder="Tipo, cantidad, tamaño de las mascotas"
                        disabled={disabled}
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
