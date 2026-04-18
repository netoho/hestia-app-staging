import { describe, it, expect } from 'bun:test';
import { numberToSpanishCardinal, amountToSpanishLegal } from '../numberToSpanishWords';

describe('numberToSpanishCardinal', () => {
  it('returns CERO for 0', () => {
    expect(numberToSpanishCardinal(0)).toBe('CERO');
  });

  it('returns UN for 1 (apocope — intended for compounds like "UN MILLÓN")', () => {
    expect(numberToSpanishCardinal(1)).toBe('UN');
  });

  it('returns single-digit units', () => {
    expect(numberToSpanishCardinal(2)).toBe('DOS');
    expect(numberToSpanishCardinal(9)).toBe('NUEVE');
  });

  it('returns teens', () => {
    expect(numberToSpanishCardinal(10)).toBe('DIEZ');
    expect(numberToSpanishCardinal(11)).toBe('ONCE');
    expect(numberToSpanishCardinal(15)).toBe('QUINCE');
    expect(numberToSpanishCardinal(19)).toBe('DIECINUEVE');
  });

  it('returns twenties (single-word apocope form for 21)', () => {
    expect(numberToSpanishCardinal(20)).toBe('VEINTE');
    expect(numberToSpanishCardinal(21)).toBe('VEINTIÚN');
    expect(numberToSpanishCardinal(28)).toBe('VEINTIOCHO');
  });

  it('returns tens joined with Y', () => {
    expect(numberToSpanishCardinal(30)).toBe('TREINTA');
    expect(numberToSpanishCardinal(31)).toBe('TREINTA Y UN');
    expect(numberToSpanishCardinal(45)).toBe('CUARENTA Y CINCO');
    expect(numberToSpanishCardinal(99)).toBe('NOVENTA Y NUEVE');
  });

  it('handles 100 as CIEN and 101+ as CIENTO', () => {
    expect(numberToSpanishCardinal(100)).toBe('CIEN');
    expect(numberToSpanishCardinal(101)).toBe('CIENTO UN');
    expect(numberToSpanishCardinal(115)).toBe('CIENTO QUINCE');
    expect(numberToSpanishCardinal(999)).toBe('NOVECIENTOS NOVENTA Y NUEVE');
  });

  it('handles thousands', () => {
    expect(numberToSpanishCardinal(1000)).toBe('MIL');
    expect(numberToSpanishCardinal(2000)).toBe('DOS MIL');
    expect(numberToSpanishCardinal(2025)).toBe('DOS MIL VEINTICINCO');
    expect(numberToSpanishCardinal(21000)).toBe('VEINTIÚN MIL');
    expect(numberToSpanishCardinal(100000)).toBe('CIEN MIL');
  });

  it('handles millions', () => {
    expect(numberToSpanishCardinal(1_000_000)).toBe('UN MILLÓN');
    expect(numberToSpanishCardinal(2_000_000)).toBe('DOS MILLONES');
    expect(numberToSpanishCardinal(1_234_567)).toBe(
      'UN MILLÓN DOSCIENTOS TREINTA Y CUATRO MIL QUINIENTOS SESENTA Y SIETE',
    );
  });

  it('handles negative numbers', () => {
    expect(numberToSpanishCardinal(-5)).toBe('MENOS CINCO');
    expect(numberToSpanishCardinal(-1000)).toBe('MENOS MIL');
  });
});

describe('amountToSpanishLegal', () => {
  it('formats whole amount with 00/100 cents suffix', () => {
    expect(amountToSpanishLegal(50000)).toBe('CINCUENTA MIL PESOS 00/100 M.N.');
  });

  it('formats amount with decimals', () => {
    expect(amountToSpanishLegal(1234.56)).toBe(
      'MIL DOSCIENTOS TREINTA Y CUATRO PESOS 56/100 M.N.',
    );
  });

  it('carries cents into integer part when rounding reaches 100 (0.995 → 1)', () => {
    expect(amountToSpanishLegal(0.995)).toBe('UN PESOS 00/100 M.N.');
  });

  it('carries across whole numbers (49.999 → 50)', () => {
    expect(amountToSpanishLegal(49.999)).toBe('CINCUENTA PESOS 00/100 M.N.');
  });

  it('handles zero', () => {
    expect(amountToSpanishLegal(0)).toBe('CERO PESOS 00/100 M.N.');
  });

  it('zero-pads single-digit cents', () => {
    expect(amountToSpanishLegal(10.05)).toBe('DIEZ PESOS 05/100 M.N.');
  });

  it('takes absolute value for negatives (current behaviour)', () => {
    expect(amountToSpanishLegal(-100)).toBe('CIEN PESOS 00/100 M.N.');
  });
});
