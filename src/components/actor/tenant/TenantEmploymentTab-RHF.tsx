'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

interface TenantEmploymentTabProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'EMPLOYED', label: 'Empleado' },
  { value: 'SELF_EMPLOYED', label: 'Trabajador Independiente' },
  { value: 'BUSINESS_OWNER', label: 'Dueño de Negocio' },
  { value: 'RETIRED', label: 'Jubilado' },
  { value: 'STUDENT', label: 'Estudiante' },
  { value: 'UNEMPLOYED', label: 'Desempleado' },
  { value: 'OTHER', label: 'Otro' },
];

export default function TenantEmploymentTabRHF({
  initialData,
  onSave,
  disabled = false,
}: TenantEmploymentTabProps) {
  // Employment tab is only for INDIVIDUAL tenants
  const schema = getTenantTabSchema('INDIVIDUAL', 'employment');

  const form = useForm({
    resolver: zodResolver(schema as any),
    mode: 'onChange',
    defaultValues: {
      employmentStatus: initialData?.employmentStatus || '',
      occupation: initialData?.occupation || '',
      employerName: initialData?.employerName || '',
      employerAddressDetails: initialData?.employerAddressDetails || {},
      position: initialData?.position || '',
      monthlyIncome: initialData?.monthlyIncome || 0,
      incomeSource: initialData?.incomeSource || '',
      yearsAtJob: initialData?.yearsAtJob || 0,
      hasAdditionalIncome: initialData?.hasAdditionalIncome || false,
      additionalIncomeSource: initialData?.additionalIncomeSource || '',
      additionalIncomeAmount: initialData?.additionalIncomeAmount || 0,
    },
  });

  const hasAdditionalIncome = form.watch('hasAdditionalIncome');

  const handleSubmit = async (data: any) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Información Laboral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Employment Status */}
              <FormField
                control={form.control}
                name="employmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Situación Laboral</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={disabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
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
                    <FormLabel required>Ocupación</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Ej: Ingeniero, Médico, Contador"
                        disabled={disabled}
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
                    <FormLabel required>Nombre del Empleador</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nombre de la empresa"
                        disabled={disabled}
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
                        placeholder="Cargo o posición"
                        disabled={disabled}
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
                    <FormLabel required>Ingreso Mensual (MXN)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        min="0"
                        disabled={disabled}
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
                        placeholder="Ej: Salario, Honorarios, Renta"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Years at Job */}
              <FormField
                control={form.control}
                name="yearsAtJob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Años en el Empleo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Employer Address */}
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
                            form.setValue('employerAddress',
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
            </div>
          </CardContent>
        </Card>

        {/* Additional Income Section */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos Adicionales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="hasAdditionalIncome"
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
                    <FormLabel>¿Tiene ingresos adicionales?</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {hasAdditionalIncome && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <FormField
                  control={form.control}
                  name="additionalIncomeSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel optional>Fuente de Ingresos Adicionales</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          placeholder="Ej: Rentas, Inversiones"
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="additionalIncomeAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel optional>Monto Adicional (MXN)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          min="0"
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
