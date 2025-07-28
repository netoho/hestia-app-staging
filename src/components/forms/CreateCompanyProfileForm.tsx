'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, ChevronRight } from 'lucide-react';
import { t } from '@/lib/i18n';

const companyProfileSchema = z.object({
  // Legal representative personal data
  legalRepNationality: z.enum(['mexican', 'foreign']),
  legalRepCurp: z.string().optional(),
  legalRepPassport: z.string().optional(),
  legalRepFullName: z.string().min(1, 'El nombre completo es requerido'),
  
  // Company tax information
  companyTaxAddress: z.string().min(1, 'El domicilio fiscal es requerido'),
  companyTaxRegime: z.string().min(1, 'El régimen fiscal es requerido'),
}).refine(data => {
  // Validate ID based on nationality
  if (data.legalRepNationality === 'mexican') {
    return !!data.legalRepCurp && data.legalRepCurp.length === 18;
  }
  if (data.legalRepNationality === 'foreign') {
    return !!data.legalRepPassport;
  }
  return false;
}, {
  message: 'Identificación requerida según la nacionalidad',
  path: ['legalRepCurp'],
});

type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

interface CreateCompanyProfileFormProps {
  onNext: (data: CompanyProfileFormValues) => void;
  initialData?: CompanyProfileFormValues;
  companyInfo?: {
    companyName?: string;
    companyRfc?: string;
    legalRepresentativeName?: string;
  };
}

export function CreateCompanyProfileForm({ onNext, initialData, companyInfo }: CreateCompanyProfileFormProps) {
  const [nationality, setNationality] = useState<'mexican' | 'foreign'>(
    initialData?.legalRepNationality || 'mexican'
  );

  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      legalRepNationality: initialData?.legalRepNationality || 'mexican',
      legalRepCurp: initialData?.legalRepCurp || '',
      legalRepPassport: initialData?.legalRepPassport || '',
      legalRepFullName: initialData?.legalRepFullName || companyInfo?.legalRepresentativeName || '',
      companyTaxAddress: initialData?.companyTaxAddress || '',
      companyTaxRegime: initialData?.companyTaxRegime || '',
    },
  });

  const onSubmit = (values: CompanyProfileFormValues) => {
    onNext(values);
  };

  return (
    <div className="space-y-6">
      {/* Company Information Display */}
      {companyInfo && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Información de la Empresa:</strong>
            <div className="mt-2 space-y-1">
              <p>Razón Social: <strong>{companyInfo.companyName}</strong></p>
              <p>RFC: <strong>{companyInfo.companyRfc}</strong></p>
              {companyInfo.legalRepresentativeName && (
                <p>Representante Legal: <strong>{companyInfo.legalRepresentativeName}</strong></p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Legal Representative Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información del Representante Legal</h3>
            
            <FormField
              control={form.control}
              name="legalRepFullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre Completo del Representante Legal *</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez García" {...field} />
                  </FormControl>
                  <FormDescription>
                    Nombre completo como aparece en la identificación oficial
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="legalRepNationality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nacionalidad del Representante *</FormLabel>
                  <FormControl>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="mexican"
                          checked={field.value === 'mexican'}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setNationality('mexican');
                          }}
                        />
                        Mexicana
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          value="foreign"
                          checked={field.value === 'foreign'}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            setNationality('foreign');
                          }}
                        />
                        Extranjera
                      </label>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {nationality === 'mexican' ? (
              <FormField
                control={form.control}
                name="legalRepCurp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CURP del Representante Legal *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="AAAA000000AAAAAA00" 
                        maxLength={18}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Clave Única de Registro de Población (18 caracteres)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <FormField
                control={form.control}
                name="legalRepPassport"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Pasaporte *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="A12345678" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Número de pasaporte del representante legal
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          {/* Company Tax Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Información Fiscal de la Empresa</h3>
            
            <FormField
              control={form.control}
              name="companyTaxAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domicilio Fiscal *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Av. Reforma 123, Col. Centro, CDMX, CP 06000" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Domicilio fiscal completo de la empresa
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companyTaxRegime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Régimen Fiscal *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ej: 601 - General de Ley Personas Morales" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Régimen fiscal bajo el cual tributa la empresa
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Required Documents Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Documentos que necesitará en pasos posteriores:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Escritura Constitutiva con inscripción en el RPPC</li>
                <li>• Poder notarial del representante legal</li>
                <li>• Identificación oficial del representante legal</li>
                <li>• Constancia de Situación Fiscal de la empresa</li>
                <li>• Comprobante de domicilio fiscal</li>
                <li>• Estados financieros o declaraciones fiscales</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex justify-end">
            <Button type="submit">
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}