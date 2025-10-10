
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { t } from '@/lib/i18n';

const profileSchema = z.object({
  nationality: z.enum(['mexican', 'foreign']),
  curp: z.string().optional(),
  passport: z.string().optional(),
}).refine(data => {
    if (data.nationality === 'mexican') return !!data.curp && data.curp.length === 18;
    if (data.nationality === 'foreign') return !!data.passport;
    return false;
}, {
    message: t.pages.newPolicy.profile.validation.idRequired,
    path: ['curp'], // assign error to a field
});


type ProfileFormValues = z.infer<typeof profileSchema>;

interface CreatePolicyProfileFormProps {
  onNext: (data: ProfileFormValues) => void;
  initialData?: ProfileFormValues;
}

export function CreatePolicyProfileForm({ onNext, initialData }: CreatePolicyProfileFormProps) {
  const [nationality, setNationality] = useState<'mexican' | 'foreign'>(initialData?.nationality || 'mexican');

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nationality: initialData?.nationality || 'mexican',
      curp: initialData?.curp || '',
      passport: initialData?.passport || '',
    },
  });

  const onSubmit = (values: ProfileFormValues) => {
    onNext(values);
  };

  return (
    <div>
        <CardTitle className="font-headline text-xl mb-2">{t.pages.newPolicy.profile.title}</CardTitle>
        <CardDescription className="mb-6">{t.pages.newPolicy.profile.description}</CardDescription>
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
            control={form.control}
            name="nationality"
            render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel className="font-semibold">{t.pages.newPolicy.profile.nationality}</FormLabel>
                <FormControl>
                    <RadioGroup
                    onValueChange={(value: 'mexican' | 'foreign') => {
                        field.onChange(value);
                        setNationality(value);
                    }}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                    >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="mexican" />
                        </FormControl>
                        <FormLabel className="font-normal">{t.pages.newPolicy.profile.isMexican}</FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                        <RadioGroupItem value="foreign" />
                        </FormControl>
                        <FormLabel className="font-normal">{t.pages.newPolicy.profile.isForeign}</FormLabel>
                    </FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />

            {nationality === 'mexican' && (
                <FormField
                    control={form.control}
                    name="curp"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t.pages.newPolicy.profile.curpLabel}</FormLabel>
                        <p className="text-sm text-muted-foreground">{t.pages.newPolicy.profile.curpDescription}</p>
                        <FormControl>
                        <Input placeholder={t.pages.newPolicy.profile.curpPlaceholder} {...field} />
                        </FormControl>
                        <Button variant="link" className="p-0 h-auto text-sm">{t.pages.newPolicy.profile.dontKnowCurp}</Button>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}

            {nationality === 'foreign' && (
                <FormField
                    control={form.control}
                    name="passport"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t.pages.newPolicy.profile.passportLabel}</FormLabel>
                        <FormControl>
                        <Input placeholder={t.pages.newPolicy.profile.passportPlaceholder} {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}

            <div className="flex justify-end pt-4">
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                    {t.actions.next}
                </Button>
            </div>
        </form>
        </Form>
    </div>
  );
}
