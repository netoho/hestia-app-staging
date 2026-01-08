'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Loader2, Building2, User, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';
import { trpc } from '@/lib/trpc/client';

// Schema for both individual and company tenants
const policyInitiateSchema = z.object({
  // Tenant type selection
  tenantType: z.enum(['individual', 'company'], {
    required_error: "Por favor seleccione el tipo de inquilino",
  }),

  // Common fields
  tenantEmail: z.string().email('Correo electrónico inválido'),
  tenantPhone: z.string().optional(),

  // Individual tenant fields
  tenantName: z.string().optional(),

  // Company tenant fields
  companyName: z.string().optional(),
  companyRfc: z.string().optional(),
  legalRepresentativeName: z.string().optional(),
  legalRepresentativeId: z.string().optional(),
  companyAddress: z.string().optional(),

  // Property information
  propertyId: z.string().optional(),
  propertyAddress: z.string().optional(),

  // Package and pricing
  packageId: z.string().min(1, 'Por favor seleccione un paquete'),
  price: z.coerce.number().min(0, 'El precio debe ser un número positivo'),
  investigationFee: z.coerce.number().min(0, 'La tarifa de investigación debe ser un número positivo').default(200),

  // Payment split
  tenantPaymentPercent: z.coerce.number().min(0).max(100, 'El porcentaje debe estar entre 0 y 100').default(100),
  landlordPaymentPercent: z.coerce.number().min(0).max(100, 'El porcentaje debe estar entre 0 y 100').default(0),

  // Contract details
  contractLength: z.coerce.number().min(1).max(60, 'La duración del contrato debe estar entre 1 y 60 meses').default(12),
}).superRefine((data, ctx) => {
  // Validate payment percentages add up to 100
  if (data.tenantPaymentPercent + data.landlordPaymentPercent !== 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Los porcentajes de pago deben sumar 100%",
      path: ["tenantPaymentPercent"],
    });
  }

  // Validate required fields based on tenant type
  if (data.tenantType === 'individual') {
    if (!data.tenantName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre del inquilino es requerido",
        path: ["tenantName"],
      });
    }
  } else if (data.tenantType === 'company') {
    if (!data.companyName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre de la empresa es requerido",
        path: ["companyName"],
      });
    }
    if (!data.companyRfc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El RFC de la empresa es requerido",
        path: ["companyRfc"],
      });
    }
    if (!data.legalRepresentativeName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El nombre del representante legal es requerido",
        path: ["legalRepresentativeName"],
      });
    }
  }
});

type PolicyInitiateFormValues = z.infer<typeof policyInitiateSchema>;

interface PolicyInitiationFormProps {
  onSuccess?: () => void;
}

export function PolicyInitiationForm({ onSuccess }: PolicyInitiationFormProps) {
  // Use tRPC to fetch packages
  const { data: packages = [], isLoading: loadingPackages } = trpc.package.getAll.useQuery();

  // Use tRPC mutation for creating policy
  const createPolicyMutation = trpc.policy.create.useMutation({
    onSuccess: () => {
      toast({
        title: '¡Protección iniciada!',
        description: 'Se han enviado las invitaciones a los actores.',
      });
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al iniciar la protección',
        variant: 'destructive',
      });
    },
  });

  const { toast } = useToast();

  const form = useForm<PolicyInitiateFormValues>({
    resolver: zodResolver(policyInitiateSchema),
    defaultValues: {
      tenantType: 'individual',
      tenantEmail: '',
      tenantPhone: '',
      tenantName: '',
      companyName: '',
      companyRfc: '',
      legalRepresentativeName: '',
      legalRepresentativeId: '',
      companyAddress: '',
      propertyId: '',
      propertyAddress: '',
      packageId: '',
      price: 0,
      investigationFee: 200,
      tenantPaymentPercent: 100,
      landlordPaymentPercent: 0,
      contractLength: 12,
    },
  });

  const tenantType = form.watch('tenantType');


  // Update price when package selection changes
  const selectedPackageId = form.watch('packageId');
  useEffect(() => {
    if (selectedPackageId && packages.length > 0) {
      const selectedPackage = packages.find(p => p.id === selectedPackageId);
      if (selectedPackage) {
        form.setValue('price', selectedPackage.price);
      }
    }
  }, [selectedPackageId, packages, form]);

  // Auto-update landlord percentage when tenant percentage changes
  const tenantPercent = form.watch('tenantPaymentPercent');
  useEffect(() => {
    if (tenantPercent !== undefined) {
      const landlordPercent = 100 - tenantPercent;
      form.setValue('landlordPaymentPercent', Math.max(0, landlordPercent));
    }
  }, [tenantPercent, form]);


  const onSubmit = async (values: PolicyInitiateFormValues) => {
    // Use the tRPC mutation
    createPolicyMutation.mutate(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Tenant Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Tipo de Inquilino</CardTitle>
            <CardDescription>
              Seleccione si el inquilino es una persona física o una empresa (persona moral)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="tenantType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                      <div className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="individual" />
                        </FormControl>
                        <label
                          htmlFor="individual"
                          className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4" />
                            <span>Persona Física</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Para inquilinos individuales
                          </p>
                        </label>
                      </div>
                      <div className="flex items-start space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="company" />
                        </FormControl>
                        <label
                          htmlFor="company"
                          className="font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="h-4 w-4" />
                            <span>Persona Moral</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Para empresas o sociedades
                          </p>
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
            <CardDescription>
              Datos de contacto del inquilino
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tenantEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correo Electrónico *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenantPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+52 555 123 4567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tenant-specific Information */}
        {tenantType === 'individual' ? (
          <Card>
            <CardHeader>
              <CardTitle>Información del Inquilino</CardTitle>
              <CardDescription>
                Datos personales del inquilino
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Documentos requeridos para Persona Física:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Identificación oficial (INE/IFE, Pasaporte o Cédula Profesional)</li>
                    <li>• Comprobante de domicilio (no mayor a 3 meses)</li>
                    <li>• Comprobantes de ingresos (últimos 3 meses)</li>
                    <li>• Referencias personales con datos de contacto</li>
                    <li>• Documentación adicional según el caso</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <FormField
                control={form.control}
                name="tenantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Juan Pérez García"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
              <CardDescription>
                Datos de la empresa y representante legal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Documentos requeridos para Persona Moral:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Escritura Constitutiva con inscripción en el RPPC</li>
                    <li>• Escritura con facultades del representante legal</li>
                    <li>• Identificación del representante legal</li>
                    <li>• Constancia de Situación Fiscal</li>
                    <li>• Comprobante de domicilio fiscal</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razón Social *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Empresa ABC S.A. de C.V."
                          {...field}
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
                      <FormLabel>RFC *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ABC123456789"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="legalRepresentativeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre del Representante Legal *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="María González López"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="legalRepresentativeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID del Representante Legal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="INE/Pasaporte"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Número de identificación oficial
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="companyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Domicilio Fiscal</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Av. Reforma 123, Col. Centro, CDMX, CP 06000"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {/* Property Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Inmueble</CardTitle>
            <CardDescription>
              Detalles de la propiedad a rentar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID de Propiedad</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="PROP-001"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Identificador interno de la propiedad (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="propertyAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección del Inmueble</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Calle Ejemplo 123, Col. Centro, Ciudad, Estado, CP 12345"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Package and Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Paquete y Configuración de Pago</CardTitle>
            <CardDescription>
              Seleccione el paquete y configure los detalles de pago
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="packageId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paquete de Protección *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingPackages}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loadingPackages ? 'Cargando paquetes...' : 'Seleccione un paquete'} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.id} value={pkg.id}>
                          {pkg.name} - ${pkg.price} MXN
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Seleccione el tipo de protección según el perfil del inquilino
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Total (MXN) *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Precio total de la protección
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="investigationFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarifa de Investigación (MXN) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="200"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Costo de la investigación de antecedentes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contractLength"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración del Contrato (meses) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        placeholder="12"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Duración del contrato de arrendamiento
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Distribución de Pago</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tenantPaymentPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>% Pago Inquilino *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="100"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Porcentaje que paga el inquilino
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="landlordPaymentPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>% Pago Propietario *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Porcentaje que paga el propietario
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Los porcentajes de pago deben sumar exactamente 100%.
                  La configuración predeterminada es que el inquilino pague el 100% de la protección.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <Button
            type="submit"
            size="lg"
            disabled={createPolicyMutation.isPending}
          >
            {createPolicyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando Protección...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Iniciar Protección
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
