'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { getJointObligorTabSchema, type JointObligorTypeEnum } from '@/lib/schemas/joint-obligor';

// Relationship options for Joint Obligor
const RELATIONSHIP_OPTIONS = [
  { value: 'parent', label: 'Padre/Madre' },
  { value: 'sibling', label: 'Hermano(a)' },
  { value: 'spouse', label: 'Cónyuge' },
  { value: 'friend', label: 'Amigo(a)' },
  { value: 'business_partner', label: 'Socio Comercial' },
  { value: 'employer', label: 'Empleador' },
  { value: 'other', label: 'Otro' },
];

interface JointObligorPersonalInfoTabProps {
  jointObligorType: JointObligorTypeEnum;
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

export default function JointObligorPersonalInfoTabRHF({
  jointObligorType,
  initialData,
  onSave,
  disabled = false,
}: JointObligorPersonalInfoTabProps) {
  // Get appropriate schema based on joint obligor type
  const schema = getJointObligorTabSchema('personal', jointObligorType);

  // Initialize form with RHF + Zod validation
  const form = useForm({
    resolver: zodResolver(schema as any),
    mode: 'onChange',
    defaultValues: {
      jointObligorType,
      nationality: 'MEXICAN',
      ...initialData,
    },
  });

  // Watch type and nationality for dynamic UI
  const currentType = form.watch('jointObligorType');
  const currentNationality = form.watch('nationality');
  const isCompany = currentType === 'COMPANY';
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
            <CardTitle>Tipo de Obligado Solidario</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="jointObligorType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={disabled}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="INDIVIDUAL" id="jo-individual" />
                        <Label htmlFor="jo-individual" className="flex items-center cursor-pointer">
                          <User className="h-4 w-4 mr-2" />
                          Persona Física
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="COMPANY" id="jo-company" />
                        <Label htmlFor="jo-company" className="flex items-center cursor-pointer">
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
                        <Input {...field} value={field.value || ''} disabled={disabled} placeholder="Nombre de la empresa" />
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
                        <Input
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          disabled={disabled}
                          maxLength={12}
                          placeholder="RFC a 12 caracteres"
                        />
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
                            <Input {...field} value={field.value || ''} disabled={disabled} />
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
                            <Input {...field} value={field.value || ''} disabled={disabled} />
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
                            <Input
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              disabled={disabled}
                              maxLength={13}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="legalRepPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel optional>Teléfono Celular del Representante</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} disabled={disabled} maxLength={10} placeholder="10 dígitos" />
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
                          <FormLabel optional>Email del Representante</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} value={field.value || ''} disabled={disabled} />
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
                          <Input {...field} value={field.value || ''} disabled={disabled} />
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
                          <Input {...field} value={field.value || ''} disabled={disabled} />
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
                          <Input {...field} value={field.value || ''} disabled={disabled} />
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
                            <RadioGroupItem value="MEXICAN" id="jo-mexican" />
                            <Label htmlFor="jo-mexican">Mexicana</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="FOREIGN" id="jo-foreign" />
                            <Label htmlFor="jo-foreign">Extranjera</Label>
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
                          <Input
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            disabled={disabled}
                            maxLength={18}
                            placeholder="18 caracteres"
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
                        <FormLabel required>RFC</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            disabled={disabled}
                            maxLength={13}
                            placeholder="13 caracteres"
                          />
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

            {/* Relationship to Tenant - Required for Joint Obligor */}
            <div className="pt-4 border-t">
              <FormField
                control={form.control}
                name="relationshipToTenant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Relación con el Inquilino</FormLabel>
                    <Select
                      value={field.value || ''}
                      onValueChange={field.onChange}
                      disabled={disabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione la relación..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RELATIONSHIP_OPTIONS.map((option) => (
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
            </div>

            {/* Contact Information (Both types) */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value || ''} disabled={disabled} />
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
                      <Input {...field} value={field.value || ''} disabled={disabled} maxLength={10} placeholder="10 dígitos" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                  <FormLabel required>Dirección</FormLabel>
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
