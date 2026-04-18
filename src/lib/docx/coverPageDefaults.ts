/**
 * Shared defaults for the contract cover page (.docx) generator.
 */

export const BLANK = '';
export const NA = 'N/A';
export const DEFAULT_NATIONALITY = 'Mexicana.';
export const DEFAULT_COMPANY_NATIONALITY = 'Sociedad de nacionalidad mexicana.';

/**
 * Fixed cardinal directions rendered on every guarantor property,
 * matching the sample contract convention (always four rows, one per point).
 */
export const BOUNDARY_DIRECTIONS = ['Norte', 'Poniente', 'Sur', 'Oriente'] as const;
export type BoundaryDirection = (typeof BOUNDARY_DIRECTIONS)[number];
