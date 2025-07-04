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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full md:w-auto text-lg py-6" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : 'Enviar Mensaje'}
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
        title: '¡Mensaje Enviado!',
        description: state.message,
        variant: 'default',
      });
      // Consider resetting the form here if needed, though useFormState doesn't directly support this.
      // A common pattern is to redirect or clear fields via a key change on the form.
    } else if (state.type === 'error' && state.message && !state.issues) { // General error not related to field validation
       toast({
        title: 'Error',
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
          <AlertTitle>{state.type === 'error' ? 'Error' : 'Éxito'}</AlertTitle>
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
          <Label htmlFor="name">Nombre Completo</Label>
          <Input id="name" name="name" placeholder="Juan Pérez" required defaultValue={state.fields?.name} 
           className={cn(state.issues?.find(issue => issue.toLowerCase().includes('name')) && 'border-destructive')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo Electrónico</Label>
          <Input id="email" name="email" type="email" placeholder="tu@ejemplo.com" required defaultValue={state.fields?.email}
           className={cn(state.issues?.find(issue => issue.toLowerCase().includes('email')) && 'border-destructive')} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Asunto</Label>
        <Input id="subject" name="subject" placeholder="Consulta sobre servicios" required defaultValue={initialSubject || state.fields?.subject}
         className={cn(state.issues?.find(issue => issue.toLowerCase().includes('subject')) && 'border-destructive')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Mensaje</Label>
        <Textarea id="message" name="message" placeholder="Tu mensaje..." rows={5} required defaultValue={state.fields?.message}
         className={cn(state.issues?.find(issue => issue.toLowerCase().includes('message')) && 'border-destructive')} />
      </div>
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
