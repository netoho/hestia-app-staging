'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Building2, Plus, Trash2 } from 'lucide-react';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { AddressAutocomplete } from '@/components/forms/AddressAutocomplete';
import {
  landlordOwnerInfoIndividualSchema,
  landlordOwnerInfoCompanySchema,
} from '@/lib/schemas/landlord';

// Constants
const LANDLORD_LIMITS = {
  MIN: 1,
  MAX: 5,
} as const;

// Create discriminated union schema for a single landlord entry
const landlordIndividualEntrySchema = landlordOwnerInfoIndividualSchema.extend({
  id: z.string().optional().nullable(),
  isCompany: z.literal(false),
});

const landlordCompanyEntrySchema = landlordOwnerInfoCompanySchema.extend({
  id: z.string().optional().nullable(),
  isCompany: z.literal(true),
});

const landlordEntrySchema = z.discriminatedUnion('isCompany', [
  landlordIndividualEntrySchema,
  landlordCompanyEntrySchema,
]);

// Form schema for array of landlords
const landlordsFormSchema = z.object({
  landlords: z.array(landlordEntrySchema)
    .min(1, 'Al menos un arrendador es requerido')
    .max(5, 'Máximo 5 arrendadores permitidos'),
});

type LandlordsFormData = z.infer<typeof landlordsFormSchema>;

// Factory functions for empty landlords
const createEmptyIndividualLandlord = (isPrimary: boolean = false) => ({
  isCompany: false as const,
  isPrimary,
  firstName: '',
  middleName: '',
  paternalLastName: '',
  maternalLastName: '',
  // nationality: 'MEXICAN' as const,
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
  initialData: any[];
  onSave: (data: any) => Promise<void>;
  onDelete?: (landlordId: string) => Promise<void>;
  disabled?: boolean;
}

export default function LandlordOwnerInfoTabRHF({
  initialData,
  onSave,
  onDelete,
  disabled = false,
}: LandlordOwnerInfoTabRHFProps) {
  // Initialize form
  const landlords = initialData.map((l) => ({
    ...l,  // Spreads id and isPrimary from backend
    isCompany: l.isCompany ?? false,
  }))

  if (landlords.length === 0) {
    landlords[0] = [createEmptyIndividualLandlord(true)]
  }
  const form = useForm<LandlordsFormData>({
    resolver: zodResolver(landlordsFormSchema as any),
    mode: 'onChange',
    defaultValues: {
      landlords,
    },
  });

  // useFieldArray for landlords
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'landlords',
  });

  // Reset form when initialData changes (e.g., after save brings new IDs)
  useEffect(() => {
    if (initialData?.length > 0) {
      form.reset({
        landlords: initialData.map((l) => ({
          ...l,
          isCompany: l.isCompany ?? false,
        })),
      });
    }
  }, [initialData, form]);

  // Computed values
  const canAddMore = fields.length < LANDLORD_LIMITS.MAX;
  const canRemove = fields.length > LANDLORD_LIMITS.MIN;

  // Handler to add new co-owner
  const handleAddCoOwner = () => {
    if (canAddMore) {
      append(createEmptyIndividualLandlord(false));
    }
  };

  // Handler to remove co-owner (cannot remove primary/first)
  const handleRemoveCoOwner = async (index: number, isPrimary: boolean) => {
    if (!canRemove || isPrimary) return;  // Can't remove primary

    const landlord = form.getValues(`landlords.${index}`);

    if (landlord?.id) {
      // Has ID → delete from DB first
      try {
        await onDelete?.(landlord.id);
      } catch (error) {
        console.error('Failed to delete landlord:', error);
        return;  // Don't remove from form if DB delete failed
      }
    }

    // Remove from form
    remove(index);
  };

  // Handler for type switching per landlord
  const handleTypeChange = (index: number, isCompany: boolean) => {
    const isPrimary = index === 0;
    const newData = isCompany
      ? createEmptyCompanyLandlord(isPrimary)
      : createEmptyIndividualLandlord(isPrimary);

    form.setValue(`landlords.${index}`, newData as any, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Handle form submission
  const handleSubmit = async (data: LandlordsFormData) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {fields.map((field, index) => {
          const isCompany = form.watch(`landlords.${index}.isCompany`);
          const isPrimary = form.watch(`landlords.${index}.isPrimary`);

          return (
            <Card key={field.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">
                  {isPrimary ? 'Arrendador Principal' : `Copropietario ${index + 1}`}
                </CardTitle>
                {!isPrimary && canRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveCoOwner(index, isPrimary)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Type Selector */}
                <FormField
                  control={form.control}
                  name={`landlords.${index}.isCompany`}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel required>Tipo de Arrendador</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={formField.value ? 'COMPANY' : 'INDIVIDUAL'}
                          onValueChange={(val) => handleTypeChange(index, val === 'COMPANY')}
                          disabled={disabled}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="INDIVIDUAL" id={`individual-${index}`} />
                            <Label htmlFor={`individual-${index}`} className="flex items-center cursor-pointer">
                              <User className="h-4 w-4 mr-2" />
                              Persona Física
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="COMPANY" id={`company-${index}`} />
                            <Label htmlFor={`company-${index}`} className="flex items-center cursor-pointer">
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
                  <LandlordCompanyFields
                    form={form}
                    index={index}
                    disabled={disabled}
                    showAdditionalContact={isPrimary}
                  />
                ) : (
                  <LandlordIndividualFields
                    form={form}
                    index={index}
                    disabled={disabled}
                    showAdditionalContact={isPrimary}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Array-level validation errors */}
        {form.formState.errors.landlords?.root?.message && (
          <p className="text-sm text-destructive">
            {String(form.formState.errors.landlords.root.message)}
          </p>
        )}

        {/* Add co-owner button */}
        {canAddMore && (
          <Button
            type="button"
            variant="outline"
            onClick={handleAddCoOwner}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Copropietario
          </Button>
        )}
      </form>
    </Form>
  );
}

// Sub-component for Individual landlord fields
function LandlordIndividualFields({
  form,
  index,
  disabled,
  showAdditionalContact,
}: {
  form: any;
  index: number;
  disabled: boolean;
  showAdditionalContact: boolean;
}) {
  return (
    <>
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`landlords.${index}.firstName`}
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
          name={`landlords.${index}.middleName`}
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
          name={`landlords.${index}.paternalLastName`}
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
          name={`landlords.${index}.maternalLastName`}
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
          name={`landlords.${index}.curp`}
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
          name={`landlords.${index}.rfc`}
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

      {/*<FormField*/}
      {/*  control={form.control}*/}
      {/*  name={`landlords.${index}.nationality`}*/}
      {/*  render={({ field }) => (*/}
      {/*    <FormItem>*/}
      {/*      <FormLabel required>Nacionalidad</FormLabel>*/}
      {/*      <FormControl>*/}
      {/*        <RadioGroup*/}
      {/*          value={field.value || 'MEXICAN'}*/}
      {/*          onValueChange={field.onChange}*/}
      {/*          disabled={disabled}*/}
      {/*          className="flex gap-4"*/}
      {/*        >*/}
      {/*          <div className="flex items-center space-x-2">*/}
      {/*            <RadioGroupItem value="MEXICAN" id={`mexican-${index}`} />*/}
      {/*            <Label htmlFor={`mexican-${index}`}>Mexicana</Label>*/}
      {/*          </div>*/}
      {/*          <div className="flex items-center space-x-2">*/}
      {/*            <RadioGroupItem value="FOREIGN" id={`foreign-${index}`} />*/}
      {/*            <Label htmlFor={`foreign-${index}`}>Extranjera</Label>*/}
      {/*          </div>*/}
      {/*        </RadioGroup>*/}
      {/*      </FormControl>*/}
      {/*      <FormMessage />*/}
      {/*    </FormItem>*/}
      {/*  )}*/}
      {/*/>*/}

      {/* Contact Information */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <FormField
          control={form.control}
          name={`landlords.${index}.email`}
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
          name={`landlords.${index}.phone`}
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

      {/* Additional Contact (only for primary) */}
      {showAdditionalContact && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={`landlords.${index}.personalEmail`}
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
            name={`landlords.${index}.workPhone`}
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
      )}

      {/* Address */}
      <FormField
        control={form.control}
        name={`landlords.${index}.addressDetails`}
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Dirección Actual</FormLabel>
            <FormControl>
              <AddressAutocomplete
                label=""
                value={field.value || {}}
                onChange={(addressData) => {
                  field.onChange(addressData);
                  form.setValue(
                    `landlords.${index}.address`,
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
    </>
  );
}

// Sub-component for Company landlord fields
function LandlordCompanyFields({
  form,
  index,
  disabled,
  showAdditionalContact,
}: {
  form: any;
  index: number;
  disabled: boolean;
  showAdditionalContact: boolean;
}) {
  return (
    <>
      {/* Company Info */}
      <FormField
        control={form.control}
        name={`landlords.${index}.companyName`}
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
          name={`landlords.${index}.companyRfc`}
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
          name={`landlords.${index}.businessType`}
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
            name={`landlords.${index}.legalRepFirstName`}
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
            name={`landlords.${index}.legalRepMiddleName`}
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
            name={`landlords.${index}.legalRepPaternalLastName`}
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
            name={`landlords.${index}.legalRepMaternalLastName`}
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
            name={`landlords.${index}.legalRepPosition`}
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
          {/*  name={`landlords.${index}.legalRepNationality`}*/}
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
            name={`landlords.${index}.legalRepCurp`}
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
            name={`landlords.${index}.legalRepRfc`}
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
            name={`landlords.${index}.legalRepEmail`}
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
            name={`landlords.${index}.legalRepPhone`}
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
          name={`landlords.${index}.email`}
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
          name={`landlords.${index}.phone`}
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

      {/* Additional Contact (only for primary) */}
      {showAdditionalContact && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={`landlords.${index}.workEmail`}
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
            name={`landlords.${index}.workPhone`}
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
      )}

      {/* Address */}
      <FormField
        control={form.control}
        name={`landlords.${index}.addressDetails`}
        render={({ field }) => (
          <FormItem>
            <FormLabel required>Dirección de la Empresa</FormLabel>
            <FormControl>
              <AddressAutocomplete
                label=""
                value={field.value || {}}
                onChange={(addressData) => {
                  field.onChange(addressData);
                  form.setValue(
                    `landlords.${index}.address`,
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
    </>
  );
}
