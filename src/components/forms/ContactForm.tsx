'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { submitContactForm, type ContactFormState } from '@/app/contact/actions';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full md:w-auto text-lg py-6" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : t.pages.contact.form.button}
    </Button>
  );
}

interface ContactFormProps {
  initialSubject?: string;
}

export function ContactForm({ initialSubject }: ContactFormProps) {
  const initialState: ContactFormState = { message: '', type: undefined };
  const [state, formAction] = useFormState(submitContactForm, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.type === 'success') {
      toast({
        title: t.pages.contact.formState.successTitle,
        description: state.message,
        variant: 'default',
      });
    } else if (state.type === 'error' && state.message && !state.issues) {
       toast({
        title: t.pages.contact.formState.errorTitle,
        description: state.message,
        variant: 'destructive',
      });
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="space-y-6">
      {state.type && state.message && state.issues && (
         <Alert variant={state.type === 'error' ? 'destructive' : 'default'} className="mb-4">
          {state.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <AlertTitle>{state.type === 'error' ? t.pages.contact.formState.errorTitle : t.pages.contact.formState.successTitle}</AlertTitle>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">{t.pages.contact.form.name}</Label>
          <Input id="name" name="name" placeholder={t.pages.contact.form.namePlaceholder} required defaultValue={state.fields?.name} 
           className={cn(state.issues?.find(issue => issue.toLowerCase().includes('name')) && 'border-destructive')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t.pages.contact.form.email}</Label>
          <Input id="email" name="email" type="email" placeholder={t.pages.contact.form.emailPlaceholder} required defaultValue={state.fields?.email}
           className={cn(state.issues?.find(issue => issue.toLowerCase().includes('email')) && 'border-destructive')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">{t.pages.contact.form.subject}</Label>
        <Input id="subject" name="subject" placeholder={t.pages.contact.form.subjectPlaceholder} required defaultValue={initialSubject || state.fields?.subject}
         className={cn(state.issues?.find(issue => issue.toLowerCase().includes('subject')) && 'border-destructive')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">{t.pages.contact.form.message}</Label>
        <Textarea id="message" name="message" placeholder={t.pages.contact.form.messagePlaceholder} rows={5} required defaultValue={state.fields?.message}
         className={cn(state.issues?.find(issue => issue.toLowerCase().includes('message')) && 'border-destructive')} />
      </div>
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
