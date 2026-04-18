/**
 * Convert a date to Spanish long-form string as used in Mexican legal contracts.
 * Example: "2025-10-01" → "Uno de Octubre de Dos Mil Veinticinco."
 */

import { numberToSpanishCardinal } from './numberToSpanishWords';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toTitleCase(s: string): string {
  return s.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, sp, ch) => sp + ch.toUpperCase());
}

// Apocope rules: "UN" standalone → "UNO"; "VEINTIÚN" standalone → "VEINTIUNO"
function unapocopate(words: string): string {
  return words
    .replace(/VEINTIÚN(\b|$)/g, 'VEINTIUNO$1')
    .replace(/(^|\s)UN$/, '$1UNO');
}

export function dateToSpanishLong(d: Date | string | null | undefined): string {
  if (d === null || d === undefined || d === '') return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return typeof d === 'string' ? d : '';
  }

  const day = date.getDate();
  const month = MONTHS[date.getMonth()];
  const year = date.getFullYear();

  const dayWords = toTitleCase(unapocopate(numberToSpanishCardinal(day)));
  const yearWords = toTitleCase(unapocopate(numberToSpanishCardinal(year)));

  return `${dayWords} de ${month} de ${yearWords}.`;
}

/** Compact YYYYMMDD for header. Example: "2026-02-19" → "20260219". */
export function yyyymmdd(d: Date | string | null | undefined): string {
  if (d === null || d === undefined || d === '') return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (!(date instanceof Date) || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}
