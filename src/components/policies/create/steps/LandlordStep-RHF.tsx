'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { landlordStepSchema, type LandlordStepData } from '@/lib/schemas/policy/wizard';
import { t } from '@/lib/i18n';

interface LandlordStepRHFProps {
  initialData: Partial<LandlordStepData>;
  onSave: (data: LandlordStepData) => Promise<void>;
  disabled?: boolean;
}

export default function LandlordStepRHF({
  initialData,
  onSave,
  disabled = false,
}: LandlordStepRHFProps) {
  const form = useForm<LandlordStepData>({
    resolver: zodResolver(landlordStepSchema),
    mode: 'onChange',
    defaultValues: {
      isCompany: false,
      firstName: '',
      middleName: '',
      paternalLastName: '',
      maternalLastName: '',
      email: '',
      phone: '',
      rfc: '',
      ...initialData,
    } as LandlordStepData,
  });

  const isCompany = form.watch('isCompany');

  const handleSubmit = async (data: LandlordStepData) => {
    await onSave(data);
  };

  // Handle isCompany toggle - reset form fields appropriately
  const handleIsCompanyChange = (checked: boolean) => {
    if (checked) {
      form.reset({
        isCompany: true,
        companyName: '',
        companyRfc: '',
        legalRepName: '',
        legalRepPosition: '',
        legalRepRfc: '',
        legalRepPhone: '',
        legalRepEmail: '',
        email: form.getValues('email'),
        phone: form.getValues('phone'),
      } as LandlordStepData);
    } else {
      form.reset({
        isCompany: false,
        firstName: '',
        middleName: '',
        paternalLastName: '',
        maternalLastName: '',
        email: form.getValues('email'),
        phone: form.getValues('phone'),
        rfc: '',
      } as LandlordStepData);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{t.pages.createPolicy.steps.landlord.title}</CardTitle>
            <CardDescription>{t.pages.createPolicy.steps.landlord.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Company Toggle */}
            <FormField
              control={form.control}
              name="isCompany"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        handleIsCompanyChange(checked as boolean);
                      }}
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">{t.pages.createPolicy.steps.landlord.isCompany}</FormLabel>
                </FormItem>
              )}
            />

            {isCompany ? (
              <>
                {/* Company Fields */}
                <FormField
                  control={form.control}
                  name="companyName"
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
                  name="companyRfc"
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

                {/* Legal Representative Section */}
                <div className="border-l-2 border-blue-200 pl-4 space-y-4">
                  <h4 className="font-medium text-sm text-foreground">{t.pages.createPolicy.steps.landlord.legalRepresentative}</h4>

                  <FormField
                    control={form.control}
                    name="legalRepName"
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
                    name="legalRepPosition"
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
                      name="legalRepRfc"
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
                      name="legalRepPhone"
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
                    name="legalRepEmail"
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
              </>
            ) : (
              <>
                {/* Individual Person Fields */}
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

                <FormField
                  control={form.control}
                  name="rfc"
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
              </>
            )}

            {/* Common Fields (both company and individual) */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t.pages.createPolicy.fields.contactEmail}</FormLabel>
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
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
