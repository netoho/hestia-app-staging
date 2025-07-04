
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { t } from '@/lib/i18n';
import Link from 'next/link';
import { Label } from '../ui/label';

const employmentSchema = z.object({
  employmentStatus: z.string({ required_error: t.pages.newPolicy.employment.validation.statusRequired }),
  industry: z.string({ required_error: t.pages.newPolicy.employment.validation.industryRequired }),
  occupation: z.string().min(2, { message: t.pages.newPolicy.employment.validation.occupationRequired }),
  companyName: z.string().min(2, { message: t.pages.newPolicy.employment.validation.companyNameRequired }),
  position: z.string().min(2, { message: t.pages.newPolicy.employment.validation.positionRequired }),
  companyWebsite: z.string().url({ message: t.pages.newPolicy.employment.validation.websiteInvalid }).optional().or(z.literal('')),
  workAddress: z.string().optional(),
  incomeSource: z.string({ required_error: t.pages.newPolicy.employment.validation.incomeSourceRequired }),
  monthlyIncome: z.coerce.number({invalid_type_error: t.pages.newPolicy.employment.validation.monthlyIncomeInvalid}).min(1, { message: t.pages.newPolicy.employment.validation.monthlyIncomeRequired }),
  creditCheckConsent: z.boolean().refine(val => val === true, {
    message: t.pages.newPolicy.employment.validation.creditCheckRequired,
  }),
});

type EmploymentFormValues = z.infer<typeof employmentSchema>;

interface CreatePolicyEmploymentFormProps {
  onNext: (data: EmploymentFormValues) => void;
  onBack: () => void;
}

export function CreatePolicyEmploymentForm({ onNext, onBack }: CreatePolicyEmploymentFormProps) {
  const form = useForm<EmploymentFormValues>({
    resolver: zodResolver(employmentSchema),
    defaultValues: {
      companyWebsite: '',
      workAddress: '',
      creditCheckConsent: false,
    },
  });

  const onSubmit = (values: EmploymentFormValues) => {
    console.log(values);
    onNext(values);
  };

  return (
    <div>
      <CardTitle className="font-headline text-xl mb-2">{t.pages.newPolicy.employment.title}</CardTitle>
      <CardDescription className="mb-6">{t.pages.newPolicy.employment.description}</CardDescription>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="employmentStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.pages.newPolicy.employment.statusLabel}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t.pages.newPolicy.employment.statusPlaceholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(t.pages.newPolicy.employment.statusOptions).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.pages.newPolicy.employment.industryLabel}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t.pages.newPolicy.employment.industryPlaceholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(t.pages.newPolicy.employment.industryOptions).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
              control={form.control}
              name="occupation"
              render={({ field }) => (
              <FormItem>
                  <FormLabel>{t.pages.newPolicy.employment.occupationLabel}</FormLabel>
                  <FormControl>
                  <Input placeholder={t.pages.newPolicy.employment.occupationPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
              </FormItem>
              )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{t.pages.newPolicy.employment.companyNameLabel}</FormLabel>
                    <FormControl>
                    <Input placeholder={t.pages.newPolicy.employment.companyNamePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{t.pages.newPolicy.employment.positionLabel}</FormLabel>
                    <FormControl>
                    <Input placeholder={t.pages.newPolicy.employment.positionPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>
          
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
                control={form.control}
                name="companyWebsite"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{t.pages.newPolicy.employment.companyWebsiteLabel}</FormLabel>
                    <FormControl>
                    <Input placeholder={t.pages.newPolicy.employment.companyWebsitePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="workAddress"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{t.pages.newPolicy.employment.workAddressLabel}</FormLabel>
                    <FormControl>
                    <Input placeholder={t.pages.newPolicy.employment.workAddressPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="incomeSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.pages.newPolicy.employment.incomeSourceLabel}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t.pages.newPolicy.employment.incomeSourcePlaceholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(t.pages.newPolicy.employment.incomeSourceOptions).map(([key, value]) => (
                        <SelectItem key={key} value={key}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monthlyIncome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.pages.newPolicy.employment.monthlyIncomeLabel}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                      <Input type="number" placeholder={t.pages.newPolicy.employment.monthlyIncomePlaceholder} className="pl-7" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="creditCheckConsent"
            render={({ field }) => (
              <FormItem className="space-y-4 rounded-md border p-4 shadow-sm">
                 <Label className="font-semibold">{t.pages.newPolicy.employment.creditCheckLabel}</Label>
                <div className="flex flex-row items-start space-x-3">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-1"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none text-sm text-muted-foreground">
                    <p>
                      {t.pages.newPolicy.employment.creditCheckText(t.companyLegalName)}{' '}
                      <Link href="#" className="text-primary hover:underline">{t.pages.newPolicy.employment.creditCheckLink}</Link>
                    </p>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              {t.actions.back}
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {t.actions.next}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
