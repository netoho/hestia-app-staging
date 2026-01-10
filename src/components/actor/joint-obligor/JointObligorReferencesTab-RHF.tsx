'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form';
import { getJointObligorTabSchema, type JointObligorTypeEnum } from '@/lib/schemas/joint-obligor';

interface JointObligorReferencesTabProps {
  jointObligorType: JointObligorTypeEnum;
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

export default function JointObligorReferencesTabRHF({
  jointObligorType,
  initialData,
  onSave,
  disabled = false,
}: JointObligorReferencesTabProps) {
  const isCompany = jointObligorType === 'COMPANY';

  // Get schema - automatically validates exactly 3 references
  const schema = getJointObligorTabSchema('references', jointObligorType);

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      personalReferences: initialData?.personalReferences.length > 0 ? initialData?.personalReferences : [
        { firstName: '', middleName: '', paternalLastName: '', maternalLastName: '', phone: '', email: '', relationship: '', occupation: '', address: '' },
        { firstName: '', middleName: '', paternalLastName: '', maternalLastName: '', phone: '', email: '', relationship: '', occupation: '', address: '' },
        { firstName: '', middleName: '', paternalLastName: '', maternalLastName: '', phone: '', email: '', relationship: '', occupation: '', address: '' },
      ],
      commercialReferences: initialData?.commercialReferences.length > 0 ? initialData?.commercialReferences : [
        { companyName: '', contactFirstName: '', contactMiddleName: '', contactPaternalLastName: '', contactMaternalLastName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
        { companyName: '', contactFirstName: '', contactMiddleName: '', contactPaternalLastName: '', contactMaternalLastName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
        { companyName: '', contactFirstName: '', contactMiddleName: '', contactPaternalLastName: '', contactMaternalLastName: '', phone: '', email: '', relationship: '', yearsOfRelationship: 0 },
      ],
    },
  });

  // Use fieldArray for references (fixed 3)
  const { fields: personalFields } = useFieldArray({
    control: form.control,
    name: 'personalReferences',
  });

  const { fields: commercialFields } = useFieldArray({
    control: form.control,
    name: 'commercialReferences',
  });

  const handleSubmit = async (data: any) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Personal References - Only for Individuals */}
        {!isCompany && (
          <Card>
            <CardHeader>
              <CardTitle>Referencias Personales</CardTitle>
              <p className="text-sm text-muted-foreground">
                Proporcione exactamente 3 referencias personales que no sean familiares directos
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {personalFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-medium">Referencia Personal {index + 1}</h4>

                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`personalReferences.${index}.firstName`}
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
                              <Input {...field} value={field.value || ''} disabled={disabled} />
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
                            <FormLabel required>Apellido Materno</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} disabled={disabled} />
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
                              <Input {...field} value={field.value || ''} placeholder="10 dígitos" maxLength={10} disabled={disabled} />
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
                              <Input type="email" {...field} value={field.value || ''} placeholder="correo@ejemplo.com" disabled={disabled} />
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
                              <Input {...field} value={field.value || ''} placeholder="Ej: Amigo, Colega, Vecino" disabled={disabled} />
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
                              <Input {...field} value={field.value || ''} placeholder="Ocupación" disabled={disabled} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Address - Required for Joint Obligor references */}
                    <FormField
                      control={form.control}
                      name={`personalReferences.${index}.address`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel optional>Dirección</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ''}
                              placeholder="Dirección completa de la referencia"
                              disabled={disabled}
                              rows={2}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}

                {/* Show array-level validation errors */}
                {form.formState.errors.personalReferences?.root?.message && (
                  <p className="text-sm text-destructive">
                    {String(form.formState.errors.personalReferences.root.message)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commercial References - Only for Companies */}
        {isCompany && (
          <Card>
            <CardHeader>
              <CardTitle>Referencias Comerciales</CardTitle>
              <p className="text-sm text-muted-foreground">
                Proporcione exactamente 3 referencias comerciales (proveedores, clientes, instituciones financieras)
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {commercialFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4">
                    <h4 className="font-medium">Referencia Comercial {index + 1}</h4>

                    {/* Company Name */}
                    <FormField
                      control={form.control}
                      name={`commercialReferences.${index}.companyName`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel required>Nombre de la Empresa</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="Nombre de la empresa" disabled={disabled} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Contact Name Fields */}
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
                                <Input {...field} value={field.value || ''} disabled={disabled} />
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
                                <Input {...field} value={field.value || ''} disabled={disabled} />
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
                              <FormLabel required>Apellido Materno</FormLabel>
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
                              <Input {...field} value={field.value || ''} placeholder="10 dígitos" maxLength={10} disabled={disabled} />
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
                              <Input type="email" {...field} value={field.value || ''} placeholder="correo@ejemplo.com" disabled={disabled} />
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
                              <Input {...field} value={field.value || ''} placeholder="Ej: Proveedor, Cliente, Banco" disabled={disabled} />
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
                  </div>
                ))}

                {/* Show array-level validation errors */}
                {form.formState.errors.commercialReferences?.root?.message && (
                  <p className="text-sm text-destructive">
                    {String(form.formState.errors.commercialReferences.root.message)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </Form>
  );
}
