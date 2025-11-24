import { z } from 'zod';

/**
 * Transforms empty strings to null, then applies your schema
 */
export const optional = <T extends z.ZodTypeAny>(schema: T) => z.preprocess(
  (val) => (typeof val === 'string' && val.trim() === '' ? null : val),
  schema.nullable()
);



