/**
 * #171 edit half — pure-logic tests for the reset-on-refetch module.
 *
 * The hook itself (version-gated form.reset + invisible-error toast) is
 * behavior the e2e suite proves (E2E-10 staleness + the walker's toastless
 * diagnostics); no DOM stack here by decision (#186). What belongs here is
 * the error-key analysis that decides WHEN the silent-save guard fires.
 */

import { describe, it, expect } from 'bun:test';
import type { FieldErrors } from 'react-hook-form';
import {
  topLevelErrorKeys,
  invisibleErrorKeys,
} from '../useWizardDataReset';

const err = { type: 'invalid_type', message: 'Requerido' };

describe('topLevelErrorKeys', () => {
  it('returns flat keys and ignores root', () => {
    const errors = {
      maritalStatus: err,
      root: { type: 'server' },
    } as unknown as FieldErrors;
    expect(topLevelErrorKeys(errors)).toEqual(['maritalStatus']);
  });

  it('reports nested shapes by their root key only', () => {
    const errors = {
      guaranteePropertyDetails: { street: err, postalCode: err },
    } as unknown as FieldErrors;
    expect(topLevelErrorKeys(errors)).toEqual(['guaranteePropertyDetails']);
  });

  it('is empty for no errors', () => {
    expect(topLevelErrorKeys({} as FieldErrors)).toEqual([]);
  });
});

describe('invisibleErrorKeys', () => {
  const errors = {
    maritalStatus: err, // stale row literal — no control in COMPANY variant
    companyName: err, // rendered control
    guaranteePropertyDetails: { street: err }, // rendered composite
  } as unknown as FieldErrors;

  it('keeps only keys with no rendered control (#190 class)', () => {
    const visible = new Set(['companyName', 'guaranteePropertyDetails']);
    expect(invisibleErrorKeys(errors, (k) => visible.has(k))).toEqual([
      'maritalStatus',
    ]);
  });

  it('empty when every error field renders a control', () => {
    expect(invisibleErrorKeys(errors, () => true)).toEqual([]);
  });

  it('reports everything when nothing renders (fully hidden tab drift)', () => {
    expect(invisibleErrorKeys(errors, () => false)).toEqual([
      'maritalStatus',
      'companyName',
      'guaranteePropertyDetails',
    ]);
  });
});
