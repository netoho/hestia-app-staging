import { TAX_CONFIG } from '@/lib/constants/businessConfig';

/**
 * Calculate IVA breakdown from subtotal using integer cents for precision.
 * Avoids floating-point errors in currency calculations.
 */
export const calculateIVA = (subtotal: number) => {
  const subtotalCents = Math.round(subtotal * 100);
  const ivaCents = Math.round(subtotalCents * TAX_CONFIG.IVA_RATE);
  const totalCents = subtotalCents + ivaCents;

  return {
    subtotal: subtotalCents / 100,
    iva: ivaCents / 100,
    total: totalCents / 100,
  };
};

/**
 * Calculate subtotal from total (reverse IVA calculation).
 * Used when you have the final amount and need to extract subtotal/IVA.
 */
export const calculateSubtotalFromTotal = (total: number) => {
  const totalCents = Math.round(total * 100);
  const subtotalCents = Math.round(totalCents / (1 + TAX_CONFIG.IVA_RATE));
  const ivaCents = totalCents - subtotalCents;

  return {
    subtotal: subtotalCents / 100,
    iva: ivaCents / 100,
    total: totalCents / 100,
  };
};

/**
 * Format currency amount in MXN.
 */
export const formatMXN = (amount: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
