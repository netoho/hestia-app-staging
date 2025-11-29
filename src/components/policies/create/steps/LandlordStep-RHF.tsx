'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { landlordStepSchema, type LandlordStepData } from '@/lib/schemas/policy/wizard';

interface LandlordStepRHFProps {
  initialData: Partial<LandlordStepData>;
  onSave: (data: LandlordStepData) => Promise<void>;
  disabled?: boolean;
}

export default function LandlordStepRHF({
  initialData,
  onSave,
  disabled = false,
}: LandlordStepRHFProps) {
  const form = useForm<LandlordStepData>({
    resolver: zodResolver(landlordStepSchema),
    mode: 'onChange',
    defaultValues: {
      isCompany: false,
      firstName: '',
      middleName: '',
      paternalLastName: '',
      maternalLastName: '',
      email: '',
      phone: '',
      rfc: '',
      ...initialData,
    } as LandlordStepData,
  });

  const isCompany = form.watch('isCompany');

  const handleSubmit = async (data: LandlordStepData) => {
    await onSave(data);
  };

  // Handle isCompany toggle - reset form fields appropriately
  const handleIsCompanyChange = (checked: boolean) => {
    if (checked) {
      form.reset({
        isCompany: true,
        companyName: '',
        companyRfc: '',
        legalRepName: '',
        legalRepPosition: '',
        legalRepRfc: '',
        legalRepPhone: '',
        legalRepEmail: '',
        email: form.getValues('email'),
        phone: form.getValues('phone'),
      } as LandlordStepData);
    } else {
      form.reset({
        isCompany: false,
        firstName: '',
        middleName: '',
        paternalLastName: '',
        maternalLastName: '',
        email: form.getValues('email'),
        phone: form.getValues('phone'),
        rfc: '',
      } as LandlordStepData);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Información del Arrendador</CardTitle>
            <CardDescription>Ingrese los datos del propietario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company Toggle */}
            <FormField
              control={form.control}
              name="isCompany"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleIsCompanyChange(checked as boolean);
                      }}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">El arrendador es una empresa</FormLabel>
                </FormItem>
              )}
            />

            {isCompany ? (
              <>
                {/* Company Fields */}
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

                <FormField
                  control={form.control}
                  name="companyRfc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel optional>RFC de la Empresa</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          placeholder="AAA123456XXX"
                          maxLength={12}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Legal Representative Section */}
                <div className="border-l-2 border-blue-200 pl-4 space-y-4">
                  <h4 className="font-medium text-sm text-gray-700">Representante Legal</h4>

                  <FormField
                    control={form.control}
                    name="legalRepName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Nombre del Representante</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="legalRepPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Cargo</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Ej: Director General"
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
                      name="legalRepRfc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel optional>RFC del Representante</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              placeholder="AAAA123456XXX"
                              maxLength={13}
                              disabled={disabled}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="legalRepPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel optional>Teléfono del Representante</FormLabel>
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
                  </div>

                  <FormField
                    control={form.control}
                    name="legalRepEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Email del Representante</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            value={field.value || ''}
                            placeholder="correo@ejemplo.com"
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Individual Person Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Nombre</FormLabel>
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
                        <FormLabel required>Apellido Paterno</FormLabel>
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

                <FormField
                  control={form.control}
                  name="rfc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel optional>RFC</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          placeholder="AAAA123456XXX"
                          maxLength={13}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Common Fields (both company and individual) */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Email de Contacto</FormLabel>
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
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
