'use server';

import * as z from 'zod';
import { t } from '@/lib/i18n';
import { sendJoinUsNotification } from '@/lib/services/emailService';

const joinUsFormSchema = z.object({
  name: z.string().min(2, { message: t.pages.joinUs.validation.nameMin }),
  email: z.string().email({ message: t.pages.joinUs.validation.emailInvalid }),
  phone: z.string().min(10, { message: t.pages.joinUs.validation.phoneMin }),
  company: z.string().optional(),
  experience: z.string().min(2, { message: t.pages.joinUs.validation.experienceMin }),
  currentClients: z.string().optional(),
  message: z.string().min(20, { message: t.pages.joinUs.validation.messageMin }),
});

export type JoinUsFormState = {
  message: string;
  fields?: Record<string, string>;
  issues?: string[];
  type?: 'success' | 'error';
};

export async function submitJoinUsForm(
  prevState: JoinUsFormState,
  data: FormData
): Promise<JoinUsFormState> {
  const formData = Object.fromEntries(data);
  const parsed = joinUsFormSchema.safeParse(formData);

  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const key of Object.keys(formData)) {
      fields[key] = formData[key].toString();
    }
    return {
      message: t.pages.joinUs.formState.invalidData,
      fields,
      issues: parsed.error.issues.map((issue) => issue.message),
      type: 'error',
    };
  }

  try {
    // Send email notification
    await sendJoinUsNotification({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      company: parsed.data.company || 'No especificada',
      experience: parsed.data.experience,
      currentClients: parsed.data.currentClients || 'No especificado',
      message: parsed.data.message,
    });

    return {
      message: t.pages.joinUs.formState.successMessage,
      type: 'success',
    };
  } catch (error) {
    console.error('Error al enviar solicitud de unirse:', error);
    return {
      message: t.pages.joinUs.formState.submitError,
      type: 'error',
    };
  }
}