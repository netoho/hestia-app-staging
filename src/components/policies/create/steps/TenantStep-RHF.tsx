'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { TenantType } from "@/prisma/generated/prisma-client/enums";
import { t } from '@/lib/i18n';
import { tenantStepSchema, type TenantStepData } from '@/lib/schemas/policy/wizard';

interface TenantStepRHFProps {
  initialData: Partial<TenantStepData>;
  onSave: (data: TenantStepData) => Promise<void>;
  disabled?: boolean;
}

export default function TenantStepRHF({
  initialData,
  onSave,
  disabled = false,
}: TenantStepRHFProps) {
  const form = useForm<TenantStepData>({
    resolver: zodResolver(tenantStepSchema),
    mode: 'onChange',
    defaultValues: {
      tenantType: TenantType.INDIVIDUAL,
      firstName: '',
      middleName: '',
      paternalLastName: '',
      maternalLastName: '',
      companyName: '',
      email: '',
      phone: '',
      rfc: '',
      ...initialData,
    },
  });

  const tenantType = form.watch('tenantType');
  const isCompany = tenantType === TenantType.COMPANY;

  const handleSubmit = async (data: TenantStepData) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{t.pages.createPolicy.steps.tenant.title}</CardTitle>
            <CardDescription>{t.pages.createPolicy.steps.tenant.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tenant Type Selector */}
            <FormField
              control={form.control}
              name="tenantType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t.pages.createPolicy.steps.tenant.tenantType}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t.pages.createPolicy.steps.tenant.selectType} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={TenantType.INDIVIDUAL}>{t.pages.createPolicy.steps.tenant.individual}</SelectItem>
                      <SelectItem value={TenantType.COMPANY}>{t.pages.createPolicy.steps.tenant.company}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Company Fields */}
            {isCompany && (
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t.pages.createPolicy.steps.tenant.companyName}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder={t.pages.createPolicy.steps.tenant.companyNamePlaceholder}
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Individual Name Fields */}
            {!isCompany && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>{t.pages.createPolicy.fields.name}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder={t.pages.createPolicy.fields.namePlaceholder}
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
                        <FormLabel optional>{t.pages.createPolicy.fields.middleName}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder={t.pages.createPolicy.fields.middleNamePlaceholder}
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
                        <FormLabel required>{t.pages.createPolicy.fields.paternalLastName}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder={t.pages.createPolicy.fields.paternalLastNamePlaceholder}
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
                        <FormLabel optional>{t.pages.createPolicy.fields.maternalLastName}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder={t.pages.createPolicy.fields.maternalLastNamePlaceholder}
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}

            {/* Company Representative Fields (Optional) */}
            {isCompany && (
              <div className="border-l-2 border-blue-200 pl-4 space-y-4">
                <h4 className="font-medium text-sm text-gray-700">
                  {t.pages.createPolicy.steps.tenant.legalRepresentative}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel optional>{t.pages.createPolicy.fields.name}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder={t.pages.createPolicy.fields.namePlaceholder}
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
                        <FormLabel optional>{t.pages.createPolicy.fields.middleName}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder={t.pages.createPolicy.fields.middleNamePlaceholder}
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
                        <FormLabel optional>{t.pages.createPolicy.fields.paternalLastName}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder={t.pages.createPolicy.fields.paternalLastNamePlaceholder}
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
                        <FormLabel optional>{t.pages.createPolicy.fields.maternalLastName}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value || ''}
                            placeholder={t.pages.createPolicy.fields.maternalLastNamePlaceholder}
                            disabled={disabled}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Contact Information */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t.pages.createPolicy.fields.email}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder={t.pages.createPolicy.fields.emailPlaceholder}
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel optional>{t.pages.createPolicy.fields.contactPhone}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder={t.pages.createPolicy.fields.phonePlaceholder}
                        disabled={disabled}
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
                    <FormLabel optional>
                      {isCompany ? t.pages.createPolicy.fields.rfc : t.pages.createPolicy.steps.tenant.rfcCurp}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        placeholder={isCompany ? t.pages.createPolicy.steps.tenant.rfcCompanyPlaceholder : t.pages.createPolicy.steps.tenant.rfcOrCurpPlaceholder}
                        maxLength={isCompany ? 12 : 18}
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
      </form>
    </Form>
  );
}
