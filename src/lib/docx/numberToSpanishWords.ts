/**
 * Convert a number to its Spanish words representation in legal Mexican format.
 * Example: 50000 → "CINCUENTA MIL PESOS 00/100 M.N."
 */

const UNITS = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const TENS_EXACT = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const TEENS = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const TWENTIES = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertHundreds(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const h = Math.floor(n / 100);
  const remainder = n % 100;

  const parts: string[] = [];
  if (h > 0) parts.push(HUNDREDS[h]);

  if (remainder > 0) {
    if (remainder < 10) {
      parts.push(UNITS[remainder]);
    } else if (remainder < 20) {
      parts.push(TEENS[remainder - 10]);
    } else if (remainder < 30) {
      parts.push(TWENTIES[remainder - 20]);
    } else {
      const t = Math.floor(remainder / 10);
      const u = remainder % 10;
      if (u === 0) {
        parts.push(TENS_EXACT[t]);
      } else {
        parts.push(`${TENS_EXACT[t]} Y ${UNITS[u]}`);
      }
    }
  }

  return parts.join(' ');
}

/**
 * Convert an integer to its Spanish cardinal words (all caps).
 * Example: 2025 → "DOS MIL VEINTICINCO"
 */
export function numberToSpanishCardinal(n: number): string {
  if (n === 0) return 'CERO';
  if (n < 0) return `MENOS ${numberToSpanishCardinal(-n)}`;

  const parts: string[] = [];

  // Millions
  const millions = Math.floor(n / 1_000_000);
  if (millions > 0) {
    if (millions === 1) {
      parts.push('UN MILLÓN');
    } else {
      parts.push(`${convertHundreds(millions)} MILLONES`);
    }
  }

  // Thousands
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  if (thousands > 0) {
    if (thousands === 1) {
      parts.push('MIL');
    } else {
      parts.push(`${convertHundreds(thousands)} MIL`);
    }
  }

  // Hundreds
  const hundreds = n % 1_000;
  if (hundreds > 0) {
    parts.push(convertHundreds(hundreds));
  }

  return parts.join(' ');
}

/**
 * Format amount in legal Mexican format.
 * @param amount - Number (can have decimals)
 * @returns e.g. "CINCUENTA MIL PESOS 00/100 M.N."
 */
export function amountToSpanishLegal(amount: number): string {
  let intPart = Math.floor(Math.abs(amount));
  let decPart = Math.round((Math.abs(amount) - intPart) * 100);
  if (decPart >= 100) {
    intPart += 1;
    decPart = 0;
  }
  const cents = String(decPart).padStart(2, '0');

  return `${numberToSpanishCardinal(intPart)} PESOS ${cents}/100 M.N.`;
}
