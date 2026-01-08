'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { User, Building2 } from 'lucide-react';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import { getTenantTabSchema, type TenantType } from '@/lib/schemas/tenant';

interface TenantPersonalInfoTabProps {
  tenantType: TenantType;
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

export default function TenantPersonalInfoTabRHF({
  tenantType,
  initialData,
  onSave,
  disabled = false,
}: TenantPersonalInfoTabProps) {
  // Get appropriate schema based on tenant type
  const schema = getTenantTabSchema(tenantType, 'personal');

  // Initialize form with RHF + Zod validation
  const form = useForm({
    resolver: zodResolver(schema as any),
    mode: 'onChange',
    defaultValues: {
      tenantType,
      nationality: 'MEXICAN',
      ...initialData,
    },
  });

  // Watch tenantType and nationality for dynamic UI
  const currentTenantType = form.watch('tenantType');
  const currentNationality = form.watch('nationality');
  const isCompany = currentTenantType === 'COMPANY';
  const isForeign = currentNationality === 'FOREIGN';

  // Handle form submission
  const handleSubmit = async (data: any) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Inquilino</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="tenantType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={disabled}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="INDIVIDUAL" id="tenant-individual" />
                        <Label htmlFor="tenant-individual" className="flex items-center cursor-pointer">
                          <User className="h-4 w-4 mr-2" />
                          Persona Física
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="COMPANY" id="tenant-company" />
                        <Label htmlFor="tenant-company" className="flex items-center cursor-pointer">
                          <Building2 className="h-4 w-4 mr-2" />
                          Persona Moral (Empresa)
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Información {isCompany ? 'de la Empresa' : 'Personal'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                        <Input {...field} disabled={disabled} placeholder="Nombre de la empresa" />
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
                      <FormLabel required>RFC de la Empresa</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} maxLength={12} placeholder="RFC a 12 caracteres" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Email de la Empresa</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} disabled={disabled} />
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
                      <FormLabel required>Teléfono de la Empresa</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} maxLength={10} placeholder="10 dígitos" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Legal Representative */}
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-4">Representante Legal</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="legalRepFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Nombre</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={disabled} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="legalRepMiddleName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel optional>Segundo Nombre</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} disabled={disabled} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="legalRepPaternalLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Apellido Paterno</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={disabled} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="legalRepMaternalLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Apellido Materno</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={disabled} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="legalRepPosition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Cargo</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} disabled={disabled} placeholder="Ej: Director General" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="legalRepRfc"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel optional>RFC del Representante</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} disabled={disabled} maxLength={13} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="legalRepEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Email del Representante</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} disabled={disabled} />
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
                          <FormLabel required>Teléfono Celular del Representante</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={disabled} maxLength={10} placeholder="10 dígitos" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Individual Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Nombre</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={disabled} />
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
                          <Input {...field} value={field.value || ''} disabled={disabled} />
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
                          <Input {...field} disabled={disabled} />
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
                          <Input {...field} disabled={disabled} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Nationality */}
                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Nacionalidad</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value || 'MEXICAN'}
                          onValueChange={field.onChange}
                          disabled={disabled}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="MEXICAN" id="mexican" />
                            <Label htmlFor="mexican">Mexicana</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="FOREIGN" id="foreign" />
                            <Label htmlFor="foreign">Extranjera</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="curp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>CURP</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={disabled} maxLength={18} placeholder="18 caracteres" />
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
                        <FormLabel required>RFC</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={disabled} maxLength={13} placeholder="13 caracteres" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Passport - conditional for foreigners */}
                {isForeign && (
                  <FormField
                    control={form.control}
                    name="passport"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Pasaporte</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} disabled={disabled} placeholder="Número de pasaporte" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* Contact Information (just individual) */}
            {!isCompany && (
              <>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} disabled={disabled} />
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
                        <FormLabel required>Teléfono Celular</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={disabled} maxLength={10} placeholder="10 dígitos" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="personalEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Email Personal</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value || ''} disabled={disabled} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="workPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>Teléfono de Trabajo</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} disabled={disabled} maxLength={10} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Address */}
            <FormField
              control={form.control}
              name="addressDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Dirección Actual</FormLabel>
                  <FormControl>
                    <AddressAutocomplete
                      label=""
                      value={field.value || {}}
                      onChange={(addressData) => {
                        field.onChange(addressData);
                        form.setValue('currentAddress',
                          `${addressData.street} ${addressData.exteriorNumber}${addressData.interiorNumber ? ` Int. ${addressData.interiorNumber}` : ''}, ${addressData.neighborhood}, ${addressData.municipality}, ${addressData.state}`
                        );
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
