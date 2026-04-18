/**
 * Shared programmatic defaults for the contract cover page (.docx) generator.
 *
 * User-visible Spanish strings (nationality defaults, payment-method phrases, section
 * labels) live in `src/lib/i18n/pages/documents/coverPage.ts`. This file only keeps the
 * non-Spanish markers/constants needed by the transformer and template.
 */

export const BLANK = '';
export const NA = 'N/A';

/**
 * Fixed cardinal directions rendered on every guarantor property,
 * matching the sample contract convention (always four rows, one per point).
 */
export const BOUNDARY_DIRECTIONS = ['Norte', 'Poniente', 'Sur', 'Oriente'] as const;
export type BoundaryDirection = (typeof BOUNDARY_DIRECTIONS)[number];
