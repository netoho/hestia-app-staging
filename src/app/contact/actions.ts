'use server';

import * as z from 'zod';

const contactFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  subject: z.string().min(5, { message: 'Subject must be at least 5 characters.' }),
  message: z.string().min(10, { message: 'Message must be at least 10 characters.' }),
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
      message: "Invalid form data.",
      fields,
      issues: parsed.error.issues.map((issue) => issue.message),
      type: 'error',
    };
  }

  // Simulate sending email or saving to database
  console.log('Contact form submitted:', parsed.data);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

  // Example of potential error
  // if (parsed.data.email.includes('spam')) {
  //   return {
  //     message: "There was an error submitting your message. Please try again.",
  //     type: 'error',
  //   };
  // }

  return {
    message: "Thank you for your message! We'll get back to you soon.",
    type: 'success',
  };
}
