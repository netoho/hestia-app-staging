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
import { getAvalTabSchema } from '@/lib/schemas/aval';
import type { AvalType } from '@prisma/client';

interface AvalPersonalInfoTabProps {
  avalType: AvalType;
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

export default function AvalPersonalInfoTab({
  avalType,
  initialData,
  onSave,
  disabled = false,
}: AvalPersonalInfoTabProps) {
  // Get appropriate schema based on aval type
  const schema = getAvalTabSchema(avalType, 'personal');

  // Initialize form with RHF + Zod validation
  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange', // Real-time validation
    defaultValues: {
      avalType,
      ...initialData,
    },
  });

  // Watch avalType for dynamic UI
  const currentAvalType = form.watch('avalType');
  const isCompany = currentAvalType === 'COMPANY';

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
            <CardTitle>Tipo de Aval</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="avalType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={disabled}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="INDIVIDUAL" id="aval-individual" />
                        <Label htmlFor="aval-individual" className="flex items-center cursor-pointer">
                          <User className="h-4 w-4 mr-2" />
                          Persona Física
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="COMPANY" id="aval-company" />
                        <Label htmlFor="aval-company" className="flex items-center cursor-pointer">
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
                  name="rfc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>RFC de la Empresa</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} maxLength={13} placeholder="RFC a 13 caracteres" />
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
                        <FormLabel required>Apellido Materno</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={disabled} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="curp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>CURP</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={disabled} maxLength={18} />
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
                          <Input {...field} disabled={disabled} maxLength={13} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="nationality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Nacionalidad</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={disabled} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Contact Information (Both types) */}
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
                    <FormLabel required>Teléfono</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={disabled} maxLength={10} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            {/* Relationship to Tenant */}
            <FormField
              control={form.control}
              name="relationshipToTenant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Relación con el Inquilino</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={disabled} placeholder="Ej: Familiar, Amigo, Socio" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Autocomplete - Note: needs special handling */}
            <FormField
              control={form.control}
              name="addressDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Dirección</FormLabel>
                  <FormControl>
                    <AddressAutocomplete
                      label=""
                      value={field.value || {}}
                      onChange={(addressData) => {
                        field.onChange(addressData);
                        // Also update address string field if needed
                        form.setValue('address',
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
