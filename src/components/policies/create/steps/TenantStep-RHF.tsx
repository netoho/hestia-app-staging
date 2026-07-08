'use client';

import { useForm, useFieldArray, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
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
import {
  tenantsStepSchema,
  TENANT_STEP_LIMITS,
  type TenantsStepData,
  type TenantsStepInput,
  type TenantStepData,
} from '@/lib/domain/policy/adapters/form';

interface TenantStepRHFProps {
  initialData: TenantStepData[];
  onSave: (data: TenantsStepData) => Promise<void>;
  disabled?: boolean;
}

// Form typed on the schema INPUT (tenantType has a schema default); submit yields the OUTPUT
type TenantsForm = UseFormReturn<TenantsStepInput, unknown, TenantsStepData>;

// Factory for an empty individual tenant entry
const createEmptyTenant = (): TenantStepData => ({
  tenantType: TenantType.INDIVIDUAL,
  firstName: '',
  middleName: '',
  paternalLastName: '',
  maternalLastName: '',
  companyName: '',
  email: '',
  phone: '',
  rfc: '',
});

export default function TenantStepRHF({
  initialData,
  onSave,
  disabled = false,
}: TenantStepRHFProps) {
  const tenants = initialData?.length ? initialData : [createEmptyTenant()];

  const form = useForm<TenantsStepInput, unknown, TenantsStepData>({
    resolver: zodResolver(tenantsStepSchema),
    mode: 'onChange',
    defaultValues: { tenants },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tenants',
  });

  // No upper cap by product ruling; every card is removable while more than MIN remain
  const canRemove = fields.length > TENANT_STEP_LIMITS.MIN;

  const handleSubmit = async (data: TenantsStepData) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {t.pages.createPolicy.steps.tenant.description}
        </p>

        {fields.map((field, index) => {
          const tenantType = form.watch(`tenants.${index}.tenantType`);
          const isCompany = tenantType === TenantType.COMPANY;

          return (
            <Card key={field.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle>
                  {t.pages.createPolicy.steps.tenant.tenantTitle(index + 1)}
                </CardTitle>
                {canRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t.pages.createPolicy.steps.tenant.removeCoTenant}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tenant Type Selector */}
                <FormField
                  control={form.control}
                  name={`tenants.${index}.tenantType`}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel required>{t.pages.createPolicy.steps.tenant.tenantType}</FormLabel>
                      <Select
                        value={formField.value}
                        onValueChange={formField.onChange}
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

                {isCompany ? (
                  <TenantCompanyFields form={form} index={index} disabled={disabled} />
                ) : (
                  <TenantIndividualFields form={form} index={index} disabled={disabled} />
                )}

                <TenantContactFields form={form} index={index} disabled={disabled} isCompany={isCompany} />
              </CardContent>
            </Card>
          );
        })}

        {/* Array-level validation error */}
        {form.formState.errors.tenants?.root?.message && (
          <p className="text-sm text-destructive">
            {String(form.formState.errors.tenants.root.message)}
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          {t.pages.createPolicy.steps.tenant.coTenantHelp}
        </p>

        <Button
          type="button"
          variant="outline"
          onClick={() => append(createEmptyTenant())}
          disabled={disabled}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t.pages.createPolicy.steps.tenant.addCoTenant}
        </Button>
      </form>
    </Form>
  );
}

// Per-entry individual name fields
function TenantIndividualFields({
  form,
  index,
  disabled,
}: {
  form: TenantsForm;
  index: number;
  disabled: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`tenants.${index}.firstName`}
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
          name={`tenants.${index}.middleName`}
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
          name={`tenants.${index}.paternalLastName`}
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
          name={`tenants.${index}.maternalLastName`}
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
  );
}

// Per-entry company fields (razón social + optional legal representative)
function TenantCompanyFields({
  form,
  index,
  disabled,
}: {
  form: TenantsForm;
  index: number;
  disabled: boolean;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name={`tenants.${index}.companyName`}
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

      {/* Company Representative Fields (Optional) */}
      <div className="border-l-2 border-blue-200 pl-4 space-y-4">
        <h4 className="font-medium text-sm text-foreground">
          {t.pages.createPolicy.steps.tenant.legalRepresentative}
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={`tenants.${index}.firstName`}
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
            name={`tenants.${index}.middleName`}
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
            name={`tenants.${index}.paternalLastName`}
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
            name={`tenants.${index}.maternalLastName`}
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
    </>
  );
}

// Shared contact fields (email + phone + rfc) for both individual and company entries
function TenantContactFields({
  form,
  index,
  disabled,
  isCompany,
}: {
  form: TenantsForm;
  index: number;
  disabled: boolean;
  isCompany: boolean;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name={`tenants.${index}.email`}
        render={({ field }) => (
          <FormItem>
            <FormLabel required>{t.pages.createPolicy.fields.email}</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="email"
                value={field.value || ''}
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
          name={`tenants.${index}.phone`}
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
          name={`tenants.${index}.rfc`}
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
    </>
  );
}
