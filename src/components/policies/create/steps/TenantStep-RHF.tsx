'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { TenantType } from '@/lib/enums';
import { tenantStepSchema, type TenantStepData } from '@/lib/schemas/policy/wizard';

interface TenantStepRHFProps {
  initialData: Partial<TenantStepData>;
  onSave: (data: TenantStepData) => Promise<void>;
  disabled?: boolean;
}

export default function TenantStepRHF({
  initialData,
  onSave,
  disabled = false,
}: TenantStepRHFProps) {
  const form = useForm<TenantStepData>({
    resolver: zodResolver(tenantStepSchema),
    mode: 'onChange',
    defaultValues: {
      tenantType: TenantType.INDIVIDUAL,
      firstName: '',
      middleName: '',
      paternalLastName: '',
      maternalLastName: '',
      companyName: '',
      email: '',
      phone: '',
      rfc: '',
      ...initialData,
    },
  });

  const tenantType = form.watch('tenantType');
  const isCompany = tenantType === TenantType.COMPANY;

  const handleSubmit = async (data: TenantStepData) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Información del Inquilino</CardTitle>
            <CardDescription>Ingrese los datos del inquilino</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tenant Type Selector */}
            <FormField
              control={form.control}
              name="tenantType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Tipo de Inquilino</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TenantType.INDIVIDUAL}>Persona Física</SelectItem>
                      <SelectItem value={TenantType.COMPANY}>Persona Moral (Empresa)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Company Fields */}
            {isCompany && (
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Razón Social</FormLabel>
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
            )}

            {/* Individual Name Fields */}
            {!isCompany && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Nombre</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Nombre"
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Segundo Nombre</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Segundo nombre"
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paternalLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Apellido Paterno</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Apellido paterno"
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maternalLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Apellido Materno</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Apellido materno"
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Company Representative Fields (Optional) */}
            {isCompany && (
              <div className="border-l-2 border-blue-200 pl-4 space-y-4">
                <h4 className="font-medium text-sm text-gray-700">
                  Representante Legal (Opcional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Nombre</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Nombre"
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="middleName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Segundo Nombre</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Segundo nombre"
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paternalLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Apellido Paterno</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Apellido paterno"
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maternalLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Apellido Materno</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Apellido materno"
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Contact Information */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="correo@ejemplo.com"
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Teléfono Celular de Contacto</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="10 dígitos"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rfc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>
                      {isCompany ? 'RFC' : 'RFC/CURP'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        placeholder={isCompany ? 'RFC de la empresa' : 'RFC o CURP'}
                        maxLength={isCompany ? 12 : 18}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
