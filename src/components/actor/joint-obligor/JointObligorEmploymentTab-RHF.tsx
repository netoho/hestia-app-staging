'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { getJointObligorTabSchema } from '@/lib/schemas/joint-obligor';

interface JointObligorEmploymentTabProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'EMPLOYED', label: 'Empleado' },
  { value: 'SELF_EMPLOYED', label: 'Trabajador Independiente' },
  { value: 'BUSINESS_OWNER', label: 'Dueño de Negocio' },
  { value: 'RETIRED', label: 'Jubilado' },
  { value: 'OTHER', label: 'Otro' },
];

export default function JointObligorEmploymentTabRHF({
  initialData,
  onSave,
  disabled = false,
}: JointObligorEmploymentTabProps) {
  // Employment tab is only for INDIVIDUAL joint obligors
  const schema = getJointObligorTabSchema('employment', 'INDIVIDUAL');

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
    },
  });

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
                        value={field.value || ''}
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
                    <FormLabel optional>Nombre del Empleador</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
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
                    <FormLabel optional>Ingreso Mensual (MXN)</FormLabel>
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
      </form>
    </Form>
  );
}
