'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { submitJoinUsForm, type JoinUsFormState } from '@/app/join-us/actions';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full text-lg py-6" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : t.pages.joinUs.form.button}
    </Button>
  );
}

export function JoinUsForm() {
  const initialState: JoinUsFormState = { message: '', type: undefined };
  const [state, formAction] = useFormState(submitJoinUsForm, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.type === 'success') {
      toast({
        title: t.pages.joinUs.formState.successTitle,
        description: state.message,
        variant: 'default',
      });
      // Reset form on success
      const form = document.getElementById('join-us-form') as HTMLFormElement;
      if (form) form.reset();
    } else if (state.type === 'error' && state.message && !state.issues) {
      toast({
        title: t.pages.joinUs.formState.errorTitle,
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  return (
    <form id="join-us-form" action={formAction} className="space-y-6">
      {state.type && state.message && state.issues && (
        <Alert variant={state.type === 'error' ? 'destructive' : 'default'} className="mb-4">
          {state.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertTitle>{state.type === 'error' ? t.pages.joinUs.formState.errorTitle : t.pages.joinUs.formState.successTitle}</AlertTitle>
          <AlertDescription>
            {state.message}
            {state.issues && (
              <ul className="list-disc list-inside mt-1">
                {state.issues.map((issue, i) => <li key={i}>{issue}</li>)}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">{t.pages.joinUs.form.name} *</Label>
        <Input
          id="name"
          name="name"
          placeholder={t.pages.joinUs.form.namePlaceholder}
          required
          defaultValue={state.fields?.name}
          className={cn(state.issues?.find(issue => issue.toLowerCase().includes('nombre')) && 'border-destructive')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="email">{t.pages.joinUs.form.email} *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder={t.pages.joinUs.form.emailPlaceholder}
            required
            defaultValue={state.fields?.email}
            className={cn(state.issues?.find(issue => issue.toLowerCase().includes('correo')) && 'border-destructive')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">{t.pages.joinUs.form.phone} *</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder={t.pages.joinUs.form.phonePlaceholder}
            required
            defaultValue={state.fields?.phone}
            className={cn(state.issues?.find(issue => issue.toLowerCase().includes('teléfono')) && 'border-destructive')}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">{t.pages.joinUs.form.company}</Label>
        <Input
          id="company"
          name="company"
          placeholder={t.pages.joinUs.form.companyPlaceholder}
          defaultValue={state.fields?.company}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="experience">{t.pages.joinUs.form.experience} *</Label>
          <Input
            id="experience"
            name="experience"
            placeholder={t.pages.joinUs.form.experiencePlaceholder}
            required
            defaultValue={state.fields?.experience}
            className={cn(state.issues?.find(issue => issue.toLowerCase().includes('experiencia')) && 'border-destructive')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentClients">{t.pages.joinUs.form.currentClients}</Label>
          <Input
            id="currentClients"
            name="currentClients"
            placeholder={t.pages.joinUs.form.currentClientsPlaceholder}
            defaultValue={state.fields?.currentClients}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">{t.pages.joinUs.form.message} *</Label>
        <Textarea
          id="message"
          name="message"
          placeholder={t.pages.joinUs.form.messagePlaceholder}
          rows={6}
          required
          defaultValue={state.fields?.message}
          className={cn(state.issues?.find(issue => issue.toLowerCase().includes('mensaje')) && 'border-destructive')}
        />
      </div>

      <div>
        <SubmitButton />
      </div>
    </form>
  );
}