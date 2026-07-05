'use client';

import { useForm, useFieldArray, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  landlordsStepSchema,
  LANDLORD_STEP_LIMITS,
  type LandlordsStepData,
  type LandlordStepData,
} from '@/lib/schemas/policy/wizard';
import { t } from '@/lib/i18n';

interface LandlordStepRHFProps {
  initialData: LandlordStepData[];
  onSave: (data: LandlordsStepData) => Promise<void>;
  disabled?: boolean;
}

// Factory for an empty individual landlord entry
const createEmptyLandlord = (): LandlordStepData => ({
  isCompany: false,
  firstName: '',
  middleName: '',
  paternalLastName: '',
  maternalLastName: '',
  email: '',
  phone: '',
  rfc: '',
}) as LandlordStepData;

export default function LandlordStepRHF({
  initialData,
  onSave,
  disabled = false,
}: LandlordStepRHFProps) {
  const landlords = initialData?.length ? initialData : [createEmptyLandlord()];

  const form = useForm<LandlordsStepData>({
    resolver: zodResolver(landlordsStepSchema),
    mode: 'onChange',
    defaultValues: { landlords },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'landlords',
  });

  const canAddMore = fields.length < LANDLORD_STEP_LIMITS.MAX;
  const canRemove = fields.length > LANDLORD_STEP_LIMITS.MIN;

  const handleSubmit = async (data: LandlordsStepData) => {
    await onSave(data);
  };

  // Toggle company/individual for a single entry, resetting that entry's fields
  const handleIsCompanyChange = (index: number, checked: boolean) => {
    const common = {
      email: form.getValues(`landlords.${index}.email`),
      phone: form.getValues(`landlords.${index}.phone`),
    };
    const next = checked
      ? {
          isCompany: true,
          companyName: '',
          companyRfc: '',
          legalRepName: '',
          legalRepPosition: '',
          legalRepRfc: '',
          legalRepPhone: '',
          legalRepEmail: '',
          ...common,
        }
      : {
          isCompany: false,
          firstName: '',
          middleName: '',
          paternalLastName: '',
          maternalLastName: '',
          rfc: '',
          ...common,
        };
    form.setValue(`landlords.${index}`, next as LandlordStepData, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {fields.map((field, index) => {
          const isPrimary = index === 0;
          const isCompany = form.watch(`landlords.${index}.isCompany`);

          return (
            <Card key={field.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>
                    {isPrimary
                      ? t.pages.createPolicy.steps.landlord.primaryTitle
                      : t.pages.createPolicy.steps.landlord.coOwnerTitle(index)}
                  </CardTitle>
                  {isPrimary && (
                    <CardDescription>{t.pages.createPolicy.steps.landlord.description}</CardDescription>
                  )}
                </div>
                {!isPrimary && canRemove && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t.pages.createPolicy.steps.landlord.removeCoOwner}
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Company Toggle */}
                <FormField
                  control={form.control}
                  name={`landlords.${index}.isCompany`}
                  render={({ field: formField }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                      <FormControl>
                        <Checkbox
                          checked={formField.value}
                          onCheckedChange={(checked) => {
                            formField.onChange(checked);
                            handleIsCompanyChange(index, checked as boolean);
                          }}
                          disabled={disabled}
                        />
                      </FormControl>
                      <FormLabel className="font-normal">
                        {t.pages.createPolicy.steps.landlord.isCompany}
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {isCompany ? (
                  <LandlordCompanyFields form={form} index={index} disabled={disabled} />
                ) : (
                  <LandlordIndividualFields form={form} index={index} disabled={disabled} />
                )}
              </CardContent>
            </Card>
          );
        })}

        {/* Array-level validation error */}
        {form.formState.errors.landlords?.root?.message && (
          <p className="text-sm text-destructive">
            {String(form.formState.errors.landlords.root.message)}
          </p>
        )}

        <p className="text-sm text-muted-foreground">
          {t.pages.createPolicy.steps.landlord.coOwnerHelp}
        </p>

        {canAddMore && (
          <Button
            type="button"
            variant="outline"
            onClick={() => append(createEmptyLandlord())}
            disabled={disabled}
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.pages.createPolicy.steps.landlord.addCoOwner}
          </Button>
        )}
      </form>
    </Form>
  );
}

// Per-entry individual fields
function LandlordIndividualFields({
  form,
  index,
  disabled,
}: {
  form: UseFormReturn<LandlordsStepData>;
  index: number;
  disabled: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={`landlords.${index}.firstName`}
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
          name={`landlords.${index}.middleName`}
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
          name={`landlords.${index}.paternalLastName`}
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
          name={`landlords.${index}.maternalLastName`}
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

      <FormField
        control={form.control}
        name={`landlords.${index}.rfc`}
        render={({ field }) => (
          <FormItem>
            <FormLabel optional>{t.pages.createPolicy.fields.rfc}</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                placeholder={t.pages.createPolicy.fields.rfcPlaceholder}
                maxLength={13}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <LandlordContactFields form={form} index={index} disabled={disabled} />
    </>
  );
}

// Per-entry company fields
function LandlordCompanyFields({
  form,
  index,
  disabled,
}: {
  form: UseFormReturn<LandlordsStepData>;
  index: number;
  disabled: boolean;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name={`landlords.${index}.companyName`}
        render={({ field }) => (
          <FormItem>
            <FormLabel required>{t.pages.createPolicy.steps.landlord.companyName}</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value || ''}
                placeholder={t.pages.createPolicy.steps.landlord.companyNamePlaceholder}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`landlords.${index}.companyRfc`}
        render={({ field }) => (
          <FormItem>
            <FormLabel optional>{t.pages.createPolicy.steps.landlord.companyRfc}</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                placeholder={t.pages.createPolicy.fields.rfcCompanyPlaceholder}
                maxLength={12}
                disabled={disabled}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Legal Representative */}
      <div className="border-l-2 border-blue-200 pl-4 space-y-4">
        <h4 className="font-medium text-sm text-foreground">
          {t.pages.createPolicy.steps.landlord.legalRepresentative}
        </h4>

        <FormField
          control={form.control}
          name={`landlords.${index}.legalRepName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>{t.pages.createPolicy.steps.landlord.repName}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''}
                  placeholder={t.pages.createPolicy.steps.landlord.repNamePlaceholder}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`landlords.${index}.legalRepPosition`}
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>{t.pages.createPolicy.steps.landlord.repPosition}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''}
                  placeholder={t.pages.createPolicy.steps.landlord.repPositionPlaceholder}
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
            name={`landlords.${index}.legalRepRfc`}
            render={({ field }) => (
              <FormItem>
                <FormLabel optional>{t.pages.createPolicy.steps.landlord.repRfc}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    placeholder={t.pages.createPolicy.fields.rfcPlaceholder}
                    maxLength={13}
                    disabled={disabled}
                  />
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
                <FormLabel optional>{t.pages.createPolicy.steps.landlord.repPhone}</FormLabel>
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
        </div>

        <FormField
          control={form.control}
          name={`landlords.${index}.legalRepEmail`}
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>{t.pages.createPolicy.steps.landlord.repEmail}</FormLabel>
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
      </div>

      <LandlordContactFields form={form} index={index} disabled={disabled} />
    </>
  );
}

// Shared contact fields (email + phone) for both individual and company entries
function LandlordContactFields({
  form,
  index,
  disabled,
}: {
  form: UseFormReturn<LandlordsStepData>;
  index: number;
  disabled: boolean;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name={`landlords.${index}.email`}
        render={({ field }) => (
          <FormItem>
            <FormLabel required>{t.pages.createPolicy.fields.contactEmail}</FormLabel>
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

      <FormField
        control={form.control}
        name={`landlords.${index}.phone`}
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
    </>
  );
}
