
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { t } from '@/lib/i18n';

const referencesSchema = z.object({
  personalReferenceName: z.string().min(3, { message: t.pages.newPolicy.references.validation.nameRequired }),
  personalReferencePhone: z.string().min(10, { message: t.pages.newPolicy.references.validation.phoneRequired }),
  workReferenceName: z.string().optional(),
  workReferencePhone: z.string().optional(),
  landlordReferenceName: z.string().optional(),
  landlordReferencePhone: z.string().optional(),
});

type ReferencesFormValues = z.infer<typeof referencesSchema>;

interface CreatePolicyReferencesFormProps {
  onNext: (data: ReferencesFormValues) => void;
  onBack: () => void;
  initialData?: ReferencesFormValues;
}

export function CreatePolicyReferencesForm({ onNext, onBack, initialData }: CreatePolicyReferencesFormProps) {
  const form = useForm<ReferencesFormValues>({
    resolver: zodResolver(referencesSchema),
    defaultValues: {
      personalReferenceName: initialData?.personalReferenceName || '',
      personalReferencePhone: initialData?.personalReferencePhone || '',
      workReferenceName: initialData?.workReferenceName || '',
      workReferencePhone: initialData?.workReferencePhone || '',
      landlordReferenceName: initialData?.landlordReferenceName || '',
      landlordReferencePhone: initialData?.landlordReferencePhone || '',
    },
  });

  const onSubmit = (values: ReferencesFormValues) => {
    console.log(values);
    onNext(values);
  };

  return (
    <div>
      <CardTitle className="font-headline text-xl mb-2">{t.pages.newPolicy.references.title}</CardTitle>
      <CardDescription className="mb-6">{t.pages.newPolicy.references.description}</CardDescription>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t.pages.newPolicy.references.personalTitle}</h3>
            <Alert className="mb-6 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription>
                {t.pages.newPolicy.references.personalAlert}
              </AlertDescription>
            </Alert>
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="personalReferenceName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.pages.newPolicy.references.personalNameLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={t.pages.newPolicy.references.namePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="personalReferencePhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.pages.newPolicy.references.phoneLabel}</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder={t.pages.newPolicy.references.phonePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <Separator className="my-8" />

          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">{t.pages.newPolicy.references.optionalTitle}</h3>
            <Alert className="mb-6 bg-primary/5">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription>
                {t.pages.newPolicy.references.optionalAlert}
              </AlertDescription>
            </Alert>

            <div className="space-y-8">
              <div>
                <h4 className="font-medium text-foreground mb-4">{t.pages.newPolicy.references.workTitle}</h4>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="workReferenceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.pages.newPolicy.references.workNameLabel}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.pages.newPolicy.references.namePlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workReferencePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.pages.newPolicy.references.workPhoneLabel}</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder={t.pages.newPolicy.references.phonePlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-4">{t.pages.newPolicy.references.landlordTitle}</h4>
                <div className="space-y-6">
                   <FormField
                    control={form.control}
                    name="landlordReferenceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.pages.newPolicy.references.landlordNameLabel}</FormLabel>
                        <FormControl>
                          <Input placeholder={t.pages.newPolicy.references.namePlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="landlordReferencePhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t.pages.newPolicy.references.landlordPhoneLabel}</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder={t.pages.newPolicy.references.phonePlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
          
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
