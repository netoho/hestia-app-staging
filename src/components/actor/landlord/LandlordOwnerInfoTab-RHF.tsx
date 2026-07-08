'use client';

import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  FormMessage,
} from '@/components/ui/form';
import { useWizardDataReset } from '@/components/actor/shared/useWizardDataReset';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import {
  landlordOwnerInfoIndividualSchema,
  landlordOwnerInfoCompanySchema,
} from '@/lib/schemas/landlord';

// Create discriminated union schema for a single landlord entry
const landlordIndividualEntrySchema = landlordOwnerInfoIndividualSchema.extend({
  id: z.string().optional().nullable(),
  isCompany: z.literal(false),
});

const landlordCompanyEntrySchema = landlordOwnerInfoCompanySchema.extend({
  id: z.string().optional().nullable(),
  isCompany: z.literal(true),
});

// Factory functions for empty landlords
const createEmptyIndividualLandlord = (isPrimary: boolean = false) => ({
  isCompany: false as const,
  isPrimary,
  firstName: '',
  middleName: '',
  paternalLastName: '',
  maternalLastName: '',
  nationality: 'MEXICAN' as const,
  curp: '',
  rfc: '',
  email: '',
  phone: '',
  personalEmail: '',
  workEmail: '',
  workPhone: '',
  address: '',
  addressDetails: {},
});

const createEmptyCompanyLandlord = (isPrimary: boolean = false) => ({
  isCompany: true as const,
  isPrimary,
  companyName: '',
  companyRfc: '',
  businessType: '',
  legalRepFirstName: '',
  legalRepMiddleName: '',
  legalRepPaternalLastName: '',
  legalRepMaternalLastName: '',
  legalRepPosition: '',
  legalRepRfc: '',
  legalRepCurp: '',
  legalRepPhone: '',
  legalRepEmail: '',
  // legalRepNationality: '',
  email: '',
  phone: '',
  personalEmail: '',
  workEmail: '',
  workPhone: '',
  address: '',
  addressDetails: {},
});

interface LandlordOwnerInfoTabRHFProps {
  /** THIS landlord's record — per-record surface, #189. */
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

/**
 * Single-record owner-info form (#189): each landlord edits ONLY their own
 * record — the token-scoped portal and the per-card admin editor render the
 * exact same form. The collective indexed form (landlords.N.*) and its
 * in-form add/remove died with the "primary landlord" special case;
 * co-owner add/remove is admin-only on the policy's landlord tab.
 */
export default function LandlordOwnerInfoTabRHF({
  initialData,
  onSave,
  disabled = false,
}: LandlordOwnerInfoTabRHFProps) {
  const isCompanyInitial = initialData?.isCompany ?? false;
  const defaultValues = {
    ...(isCompanyInitial ? createEmptyCompanyLandlord() : createEmptyIndividualLandlord()),
    ...initialData,
    isCompany: isCompanyInitial,
  };

  const form = useForm({
    // Resolve against the branch for the type currently SELECTED in the
    // form — a resolver pinned to the mount-time prop rejects the type
    // switch on the isCompany literal (dead-toggle class, same as
    // tenant/JO/aval personal tabs).
    resolver: ((values: any, ctx: any, options: any) =>
      zodResolver(
        (values.isCompany
          ? landlordCompanyEntrySchema
          : landlordIndividualEntrySchema) as unknown as Parameters<typeof zodResolver>[0],
      )(values, ctx, options)) as Resolver<any>,
    mode: 'onChange',
    defaultValues,
  });
  useWizardDataReset(form, defaultValues);

  const isCompany = form.watch('isCompany');

  const handleSubmit = async (data: any) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Información del Arrendador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Type Selector */}
            <FormField
              control={form.control}
              name="isCompany"
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel required>Tipo de Arrendador</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={formField.value ? 'COMPANY' : 'INDIVIDUAL'}
                      onValueChange={(val) =>
                        formField.onChange(val === 'COMPANY')
                      }
                      disabled={disabled}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="INDIVIDUAL" id="individual" />
                        <Label htmlFor="individual" className="flex items-center cursor-pointer">
                          <User className="h-4 w-4 mr-2" />
                          Persona Física
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="COMPANY" id="company" />
                        <Label htmlFor="company" className="flex items-center cursor-pointer">
                          <Building2 className="h-4 w-4 mr-2" />
                          Persona Moral
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditional Fields based on isCompany */}
            {isCompany ? (
              <LandlordCompanyFields form={form} disabled={disabled} />
            ) : (
              <LandlordIndividualFields form={form} disabled={disabled} />
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}

// Sub-component for Individual landlord fields
function LandlordIndividualFields({
  form,
  disabled,
}: {
  form: any;
  disabled: boolean;
}) {
  return (
    <>
      {/* Name Fields */}
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
                <Input {...field} value={field.value || ''} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* CURP, RFC, Nationality */}
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

      {/* Contact Information */}
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

      {/* Additional Contact — every landlord is first-class (#189 un-gated
          the legacy isPrimary condition; co-owners fill their own). */}
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

        {/* Declared by the landlord owner-info schema but previously
            unrendered on the individual card — #180 walker finding. */}
        <FormField
          control={form.control}
          name="workEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>Email de Trabajo</FormLabel>
              <FormControl>
                <Input type="email" {...field} value={field.value || ''} disabled={disabled} />
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
                onChange={field.onChange}
                required
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}

// Sub-component for Company landlord fields
function LandlordCompanyFields({
  form,
  disabled,
}: {
  form: any;
  disabled: boolean;
}) {
  return (
    <>
      {/* Company Info */}
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

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="companyRfc"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>RFC de la Empresa</FormLabel>
              <FormControl>
                <Input {...field} disabled={disabled} maxLength={12} placeholder="12 caracteres" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="businessType"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>Giro de la Empresa</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} disabled={disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

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
                <FormLabel optional>Apellido Materno</FormLabel>
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
                  <Input {...field} disabled={disabled} placeholder="Ej: Director General" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/*<FormField*/}
          {/*  control={form.control}*/}
          {/*  name="legalRepNationality"*/}
          {/*  render={({ field }) => (*/}
          {/*    <FormItem>*/}
          {/*      <FormLabel optional>Nacionalidad</FormLabel>*/}
          {/*      <FormControl>*/}
          {/*        <Input {...field} value={field.value || ''} disabled={disabled} />*/}
          {/*      </FormControl>*/}
          {/*      <FormMessage />*/}
          {/*    </FormItem>*/}
          {/*  )}*/}
          {/*/>*/}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <FormField
            control={form.control}
            name="legalRepCurp"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>CURP del Representante</FormLabel>
                <FormControl>
                  <Input {...field} disabled={disabled} maxLength={18} />
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
                <FormLabel required>RFC del Representante</FormLabel>
                <FormControl>
                  <Input {...field} disabled={disabled} maxLength={13} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
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
                  <Input {...field} disabled={disabled} maxLength={10} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Company Contact Information */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
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
                <Input {...field} disabled={disabled} maxLength={10} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Additional Contact — every landlord is first-class (#189 un-gated
          the legacy isPrimary condition). */}
      <div className="grid grid-cols-2 gap-4">
        {/* Declared by the landlord company schema but previously
            unrendered — #180 walker finding. */}
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
          name="workEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>Email Adicional</FormLabel>
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
              <FormLabel optional>Teléfono Adicional</FormLabel>
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
            <FormLabel required>Dirección de la Empresa</FormLabel>
            <FormControl>
              <AddressAutocomplete
                label=""
                value={field.value || {}}
                onChange={field.onChange}
                required
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
