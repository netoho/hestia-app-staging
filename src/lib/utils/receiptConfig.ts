import { ReceiptType } from '@/prisma/generated/prisma-client/enums';

export interface ReceiptConfigEntry {
  effectiveYear: number;
  effectiveMonth: number;
  receiptTypes: ReceiptType[];
}

/**
 * Resolve the effective receipt types for a given month from config history.
 * Finds the latest config where (effectiveYear, effectiveMonth) <= (year, month).
 * Falls back to `fallbackTypes` if no config applies.
 */
export function getTypesForMonth(
  configs: ReceiptConfigEntry[],
  year: number,
  month: number,
  fallbackTypes: ReceiptType[],
): ReceiptType[] {
  if (configs.length === 0) return fallbackTypes;

  // Configs should be sorted ascending, find the last one <= target month
  let matched: ReceiptConfigEntry | undefined;
  for (const c of configs) {
    if (c.effectiveYear < year || (c.effectiveYear === year && c.effectiveMonth <= month)) {
      matched = c;
    } else {
      break;
    }
  }

  return matched ? matched.receiptTypes : fallbackTypes;
}
