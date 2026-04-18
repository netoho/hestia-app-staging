import { describe, it, expect } from 'bun:test';
import { dateToSpanishLong, yyyymmdd } from '../dateToSpanishLong';

/*
 * Use the `new Date(year, monthIndex, day)` constructor (local-time) for every
 * Date under test. Passing ISO strings like '2025-10-01' would be parsed as UTC,
 * producing off-by-one days in non-UTC timezones — fine for the service code
 * (which hands in Prisma `Date` objects) but flaky for the test runner.
 */

describe('dateToSpanishLong', () => {
  it('formats a standard date (day + month + year)', () => {
    expect(dateToSpanishLong(new Date(2025, 9, 1))).toBe(
      'Uno de Octubre de Dos Mil Veinticinco.',
    );
  });

  it('uses "Uno" (not "UN") for day 1 — apocope unrolled for standalone cardinals', () => {
    expect(dateToSpanishLong(new Date(2025, 0, 1))).toBe(
      'Uno de Enero de Dos Mil Veinticinco.',
    );
  });

  it('uses "Veintiuno" (not "VEINTIÚN") for day 21 — apocope unrolled', () => {
    expect(dateToSpanishLong(new Date(2026, 1, 21))).toBe(
      'Veintiuno de Febrero de Dos Mil Veintiséis.',
    );
  });

  it('uses "Treinta Y Uno" for day 31 — trailing "UN" also unrolled', () => {
    expect(dateToSpanishLong(new Date(2024, 11, 31))).toBe(
      'Treinta Y Uno de Diciembre de Dos Mil Veinticuatro.',
    );
  });

  it('renders every month name correctly', () => {
    const expectedMonths = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];
    expectedMonths.forEach((name, monthIndex) => {
      expect(dateToSpanishLong(new Date(2025, monthIndex, 15))).toBe(
        `Quince de ${name} de Dos Mil Veinticinco.`,
      );
    });
  });

  it('returns empty string for null / undefined / empty string', () => {
    expect(dateToSpanishLong(null)).toBe('');
    expect(dateToSpanishLong(undefined)).toBe('');
    expect(dateToSpanishLong('')).toBe('');
  });

  it('returns the raw value for unparseable string input', () => {
    expect(dateToSpanishLong('not-a-date')).toBe('not-a-date');
  });

  it('returns empty string when given an invalid Date instance', () => {
    expect(dateToSpanishLong(new Date('bad'))).toBe('');
  });

  it('accepts an ISO string with local-time marker', () => {
    // The `T12:00:00` (no Z) tells JS to parse as local time; local getDate() === 1 on
    // any timezone.
    expect(dateToSpanishLong('2025-10-01T12:00:00')).toBe(
      'Uno de Octubre de Dos Mil Veinticinco.',
    );
  });
});

describe('yyyymmdd', () => {
  it('formats as YYYYMMDD with no separators', () => {
    expect(yyyymmdd(new Date(2026, 1, 19))).toBe('20260219');
  });

  it('zero-pads single-digit months and days', () => {
    expect(yyyymmdd(new Date(2025, 0, 5))).toBe('20250105');
  });

  it('returns empty string for null / undefined / empty string', () => {
    expect(yyyymmdd(null)).toBe('');
    expect(yyyymmdd(undefined)).toBe('');
    expect(yyyymmdd('')).toBe('');
  });

  it('returns empty string for unparseable input', () => {
    expect(yyyymmdd('not-a-date')).toBe('');
  });
});
