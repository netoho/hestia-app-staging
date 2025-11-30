'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2 } from 'lucide-react';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { getTenantTabSchema, type TenantType } from '@/lib/schemas/tenant';

// Constants for reference limits
const REFERENCE_LIMITS = {
  MIN: 1,
  MAX: 5,
} as const;

// Empty reference factories
const createEmptyPersonalReference = () => ({
  firstName: '',
  middleName: '',
  paternalLastName: '',
  maternalLastName: '',
  phone: '',
  email: '',
  relationship: '',
  occupation: '',
});

const createEmptyCommercialReference = () => ({
  companyName: '',
  contactFirstName: '',
  contactMiddleName: '',
  contactPaternalLastName: '',
  contactMaternalLastName: '',
  phone: '',
  email: '',
  relationship: '',
  yearsOfRelationship: 0,
});

interface TenantReferencesTabProps {
  tenantType: TenantType;
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

export default function TenantReferencesTabRHF({
  tenantType,
  initialData,
  onSave,
  disabled = false,
}: TenantReferencesTabProps) {
  const isCompany = tenantType === 'COMPANY';
  const schema = getTenantTabSchema(tenantType, 'references');

  const form = useForm({
    resolver: zodResolver(schema as any),
    mode: 'onChange',
    defaultValues: isCompany
      ? {
          commercialReferences: initialData?.commercialReferences?.length > 0
            ? initialData.commercialReferences
            : [createEmptyCommercialReference()],
        }
      : {
          personalReferences: initialData?.personalReferences?.length > 0
            ? initialData.personalReferences
            : [createEmptyPersonalReference()],
        },
  });

  // Personal references field array
  const {
    fields: personalFields,
    append: appendPersonal,
    remove: removePersonal,
  } = useFieldArray({
    control: form.control,
    name: 'personalReferences',
  });

  // Commercial references field array
  const {
    fields: commercialFields,
    append: appendCommercial,
    remove: removeCommercial,
  } = useFieldArray({
    control: form.control,
    name: 'commercialReferences',
  });

  const handleSubmit = async (data: any) => {
    await onSave(data);
  };

  // Render Personal References (INDIVIDUAL)
  if (!isCompany) {
    const canAddMore = personalFields.length < REFERENCE_LIMITS.MAX;
    const canRemove = personalFields.length > REFERENCE_LIMITS.MIN;

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Alert>
            <AlertDescription>
              Proporcione al menos 1 referencia personal (máximo 5).
              No pueden ser familiares directos ni del obligado/aval.
            </AlertDescription>
          </Alert>

          {personalFields.map((field, index) => (
            <Card key={field.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">
                  Referencia Personal {index + 1}
                </CardTitle>
                {canRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePersonal(index)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`personalReferences.${index}.firstName`}
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
                    name={`personalReferences.${index}.middleName`}
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
                    name={`personalReferences.${index}.paternalLastName`}
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
                    name={`personalReferences.${index}.maternalLastName`}
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

                {/* Contact Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`personalReferences.${index}.phone`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Teléfono</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="10 dígitos"
                            maxLength={10}
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`personalReferences.${index}.email`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            {...field}
                            value={field.value || ''}
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
                    name={`personalReferences.${index}.relationship`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>Relación</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Ej: Amigo, Colega"
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`personalReferences.${index}.occupation`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>Ocupación</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder="Ocupación"
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
          ))}

          {/* Array-level validation errors */}
          {form.formState.errors.personalReferences?.root?.message && (
            <p className="text-sm text-destructive">
              {String(form.formState.errors.personalReferences.root.message)}
            </p>
          )}

          {/* Add Reference Button */}
          {canAddMore && (
            <Button
              type="button"
              variant="outline"
              onClick={() => appendPersonal(createEmptyPersonalReference())}
              disabled={disabled}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Referencia
            </Button>
          )}
        </form>
      </Form>
    );
  }

  // Render Commercial References (COMPANY)
  const canAddMoreCommercial = commercialFields.length < REFERENCE_LIMITS.MAX;
  const canRemoveCommercial = commercialFields.length > REFERENCE_LIMITS.MIN;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Alert>
          <AlertDescription>
            Proporcione al menos 1 referencia comercial (máximo 5).
            Pueden ser proveedores, clientes o instituciones financieras.
          </AlertDescription>
        </Alert>

        {commercialFields.map((field, index) => (
          <Card key={field.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">
                Referencia Comercial {index + 1}
              </CardTitle>
              {canRemoveCommercial && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCommercial(index)}
                  disabled={disabled}
                  className="text-destructive hover:text-destructive/90"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Company Name */}
              <FormField
                control={form.control}
                name={`commercialReferences.${index}.companyName`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Nombre de la Empresa</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Razón social"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Name */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Nombre del Contacto</p>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`commercialReferences.${index}.contactFirstName`}
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
                    name={`commercialReferences.${index}.contactMiddleName`}
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
                    name={`commercialReferences.${index}.contactPaternalLastName`}
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
                    name={`commercialReferences.${index}.contactMaternalLastName`}
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
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`commercialReferences.${index}.phone`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="10 dígitos"
                          maxLength={10}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`commercialReferences.${index}.email`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel optional>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          {...field}
                          value={field.value || ''}
                          placeholder="contacto@empresa.com"
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`commercialReferences.${index}.relationship`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>Tipo de Relación</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Ej: Proveedor, Cliente"
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`commercialReferences.${index}.yearsOfRelationship`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel optional>Años de Relación</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                          placeholder="0"
                          min="0"
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
        ))}

        {/* Array-level validation errors */}
        {form.formState.errors.commercialReferences?.root?.message && (
          <p className="text-sm text-destructive">
            {String(form.formState.errors.commercialReferences.root.message)}
          </p>
        )}

        {/* Add Reference Button */}
        {canAddMoreCommercial && (
          <Button
            type="button"
            variant="outline"
            onClick={() => appendCommercial(createEmptyCommercialReference())}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Referencia
          </Button>
        )}
      </form>
    </Form>
  );
}
