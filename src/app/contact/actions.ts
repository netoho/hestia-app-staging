'use server';

import * as z from 'zod';
import { t } from '@/lib/i18n';

const contactFormSchema = z.object({
  name: z.string().min(2, { message: t.pages.contact.validation.nameMin }),
  email: z.string().email({ message: t.pages.contact.validation.emailInvalid }),
  subject: z.string().min(5, { message: t.pages.contact.validation.subjectMin }),
  message: z.string().min(10, { message: t.pages.contact.validation.messageMin }),
});

export type ContactFormState = {
  message: string;
  fields?: Record<string, string>;
  issues?: string[];
  type?: 'success' | 'error';
};

export async function submitContactForm(
  prevState: ContactFormState,
  data: FormData
): Promise<ContactFormState> {
  const formData = Object.fromEntries(data);
  const parsed = contactFormSchema.safeParse(formData);

  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const key of Object.keys(formData)) {
      fields[key] = formData[key].toString();
    }
    return {
      message: t.pages.contact.formState.invalidData,
      fields,
      issues: parsed.error.issues.map((issue) => issue.message),
      type: 'error',
    };
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    message: t.pages.contact.formState.successMessage,
    type: 'success',
  };
}
