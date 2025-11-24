/**
 * Data transformation utilities for form submissions
 */

/**
 * Recursively transform empty strings to null in an object
 * This ensures database consistency - we store null instead of empty strings
 *
 * @param obj - Object to transform (can be nested, arrays, or primitives)
 * @returns Transformed object with empty strings replaced by null
 *
 * @example
 * const input = {
 *   name: "John",
 *   middleName: "",
 *   email: "",
 *   address: { street: "", city: "NYC" }
 * }
 * const output = emptyStringsToNull(input)
 * // Result: {
 * //   name: "John",
 * //   middleName: null,
 * //   email: null,
 * //   address: { street: null, city: "NYC" }
 * // }
 */
export function emptyStringsToNull<T = any>(obj: T): T {
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle strings - transform empty to null
  if (typeof obj === 'string') {
    return (obj === '' ? null : obj) as T;
  }

  // Handle arrays - recursively transform each element
  if (Array.isArray(obj)) {
    return obj.map(item => emptyStringsToNull(item)) as T;
  }

  // Handle objects - recursively transform each property
  if (typeof obj === 'object') {
    const result: any = {};

    for (const [key, value] of Object.entries(obj)) {
      result[key] = emptyStringsToNull(value);
    }

    return result as T;
  }

  // Return primitives as-is (numbers, booleans, etc.)
  return obj;
}

/**
 * Transform empty strings to null for specific fields only
 * Useful when you want to preserve empty strings in some fields
 *
 * @param obj - Object to transform
 * @param fields - Array of field names to transform
 * @returns Object with specified fields transformed
 *
 * @example
 * const input = { name: "", description: "", notes: "" }
 * const output = transformEmptyFields(input, ['name', 'description'])
 * // Result: { name: null, description: null, notes: "" }
 */
export function transformEmptyFields<T = any>(
  obj: T,
  fields: string[]
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result: any = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const field of fields) {
    if (field in result && result[field] === '') {
      result[field] = null;
    }
  }

  return result;
}

/**
 * Clean form data by removing undefined values and transforming empty strings
 * This is useful for partial updates where we only want to send changed fields
 *
 * @param obj - Form data object
 * @param removeUndefined - Whether to remove undefined values (default: false)
 * @returns Cleaned form data
 */
export function cleanFormData<T = any>(
  obj: T,
  removeUndefined = false
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const transformed = emptyStringsToNull(obj);

  if (!removeUndefined) {
    return transformed;
  }

  // Remove undefined values if requested
  const result: any = {};

  for (const [key, value] of Object.entries(transformed as any)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as T;
}