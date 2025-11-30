'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { getAvalTabSchema } from '@/lib/schemas/aval';
import type { AvalType } from "@/prisma/generated/prisma-client/enums";

interface AvalEmploymentTabProps {
  avalType: AvalType;
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

export default function AvalEmploymentTab({
  avalType,
  initialData,
  onSave,
  disabled = false,
}: AvalEmploymentTabProps) {
  // Get schema for employment tab (all fields optional)
  const schema = getAvalTabSchema(avalType, 'employment');

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: initialData,
  });

  const handleSubmit = async (data: any) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Información Laboral</CardTitle>
            <p className="text-sm text-muted-foreground">
              Todos los campos son opcionales. Proporcione la información laboral si está disponible.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employment Status */}
              <FormField
                control={form.control}
                name="employmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Situación Laboral</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      disabled={disabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employed">Empleado</SelectItem>
                        <SelectItem value="self_employed">Trabajador Independiente</SelectItem>
                        <SelectItem value="business_owner">Dueño de Negocio</SelectItem>
                        <SelectItem value="retired">Jubilado</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Occupation */}
              <FormField
                control={form.control}
                name="occupation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Ocupación</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        disabled={disabled}
                        placeholder="Ej: Ingeniero, Médico, Contador"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Employer Name */}
              <FormField
                control={form.control}
                name="employerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Nombre del Empleador</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        disabled={disabled}
                        placeholder="Nombre de la empresa"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Position */}
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Puesto</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        disabled={disabled}
                        placeholder="Cargo o posición"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Monthly Income */}
              <FormField
                control={form.control}
                name="monthlyIncome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Ingreso Mensual (MXN)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                        disabled={disabled}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Income Source */}
              <FormField
                control={form.control}
                name="incomeSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Fuente de Ingresos</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        disabled={disabled}
                        placeholder="Ej: Salario, Honorarios, Renta"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Employer Address Autocomplete */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="employerAddressDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel optional>Dirección del Empleador</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          label=""
                          value={field.value || {}}
                          onChange={(addressData) => {
                            field.onChange(addressData);
                            // Update string representation
                            form.setValue('employerAddress',
                              `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                            );
                          }}
                          disabled={disabled}
                          required={false}
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
      </form>
    </Form>
  );
}
