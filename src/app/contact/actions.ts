'use server';

import * as z from 'zod';

const contactFormSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
  email: z.string().email({ message: 'Dirección de correo electrónico inválida.' }),
  subject: z.string().min(5, { message: 'El asunto debe tener al menos 5 caracteres.' }),
  message: z.string().min(10, { message: 'El mensaje debe tener al menos 10 caracteres.' }),
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
      message: "Datos del formulario inválidos.",
      fields,
      issues: parsed.error.issues.map((issue) => issue.message),
      type: 'error',
    };
  }

  // Simulate sending email or saving to database
  console.log('Formulario de contacto enviado:', parsed.data);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  // Example of potential error
  // if (parsed.data.email.includes('spam')) {
  //   return {
  //     message: "Hubo un error al enviar tu mensaje. Por favor, inténtalo de nuevo.",
  //     type: 'error',
  //   };
  // }

  return {
    message: "¡Gracias por tu mensaje! Nos pondremos en contacto contigo pronto.",
    type: 'success',
  };
}
