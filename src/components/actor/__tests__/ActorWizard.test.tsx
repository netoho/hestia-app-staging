/**
 * T3 (#127) — ActorWizard pure-logic tests.
 *
 * The repo deliberately has no DOM component-test stack; behavioral coverage
 * (save advances tabs, error toasts, force-complete dialog, portal
 * tab-by-tab flow) lives in the e2e suite, which drives all four actors
 * through THIS component end-to-end (tests/e2e/specs/e2e-01..08). What
 * belongs here is the pure logic: the tab-gating matrix and the per-actor
 * config integrity — every declared tab must be renderable, documents must
 * be terminal, discriminators must resolve. A config that drifts from its
 * actorConfig tab list fails here, not in production.
 */

import { describe, it, expect } from 'bun:test';
import { canAccessTab, type Tab } from '@/hooks/useFormWizardTabs';
import type { ActorWizardConfig, ActorWizardRenderCtx } from '../ActorWizard';
import { tenantWizardConfig } from '../tenant/tenantWizardConfig';
import { landlordWizardConfig } from '../landlord/landlordWizardConfig';
import { avalWizardConfig } from '../aval/avalWizardConfig';
import { jointObligorWizardConfig } from '../joint-obligor/jointObligorWizardConfig';

// ─── Tab gating (portal: sequential; admin: free) ────────────────────────────

describe('canAccessTab gating', () => {
  const tabs: Tab[] = [
    { id: 'personal', label: 'Personal', needsSave: true },
    { id: 'employment', label: 'Empleo', needsSave: true },
    { id: 'references', label: 'Referencias', needsSave: true },
    { id: 'documents', label: 'Documentos', needsSave: false },
  ];
  const none = { personal: false, employment: false, references: false, documents: false };

  it('admin edit unlocks every tab regardless of saved state', () => {
    for (const tab of tabs) {
      expect(canAccessTab(tab.id, tabs, true, none)).toBe(true);
    }
  });

  it('portal: first tab is always accessible', () => {
    expect(canAccessTab('personal', tabs, false, none)).toBe(true);
  });

  it('portal: tab N+1 is blocked until tab N is saved', () => {
    expect(canAccessTab('employment', tabs, false, none)).toBe(false);
    expect(canAccessTab('employment', tabs, false, { ...none, personal: true })).toBe(true);
  });

  it('portal: tab N+2 is blocked when only tab N is saved', () => {
    expect(canAccessTab('references', tabs, false, { ...none, personal: true })).toBe(false);
  });

  it('portal: a saved tab stays revisitable', () => {
    expect(canAccessTab('personal', tabs, false, { ...none, personal: true })).toBe(true);
    expect(
      canAccessTab('employment', tabs, false, { ...none, personal: true, employment: true }),
    ).toBe(true);
  });

  it('portal: tabs without needsSave do not block the ones after them', () => {
    const withOptional: Tab[] = [
      { id: 'personal', label: 'Personal', needsSave: true },
      { id: 'extra', label: 'Extra' },
      { id: 'documents', label: 'Documentos', needsSave: false },
    ];
    expect(
      canAccessTab('documents', withOptional, false, { personal: true, extra: false }),
    ).toBe(true);
  });
});

// ─── Config integrity (all four actors × both variants) ─────────────────────

const CONFIGS: ActorWizardConfig[] = [
  tenantWizardConfig,
  landlordWizardConfig,
  avalWizardConfig,
  jointObligorWizardConfig,
];

const fakeCtx = (): ActorWizardRenderCtx => ({
  token: 'tok',
  initialData: { id: 'a1', landlords: [{ id: 'a1' }] },
  policy: {},
  isAdminEdit: false,
  isCompany: false,
  self: { id: 'a1' },
  disabled: false,
  allTabsSaved: false,
  saveTab: () => async () => {},
  extras: { deleteLandlord: async () => {} },
  additionalInfo: '',
  setAdditionalInfo: () => {},
  setRequiredDocsUploaded: () => {},
});

describe.each(CONFIGS.map((c) => [c.actorType, c] as const))(
  '%s wizard config',
  (_type, config) => {
    it.each([false, true])('tab list is coherent (isCompany=%p)', (isCompany) => {
      const tabs = config.getTabs(isCompany);
      expect(tabs.length).toBeGreaterThan(0);

      // Unique ids
      expect(new Set(tabs.map((t) => t.id)).size).toBe(tabs.length);

      // The wizard shell owns the documents form + submit gate and fires
      // onComplete from the LAST tab — documents must be terminal.
      expect(tabs[tabs.length - 1].id).toBe('documents');

      // The initial tab must exist in every variant's list.
      expect(tabs.map((t) => t.id)).toContain(config.initialActiveTab);
    });

    it.each([false, true])(
      'every declared save-tab renders content (isCompany=%p)',
      (isCompany) => {
        const ctx = { ...fakeCtx(), isCompany };
        for (const tab of config.getTabs(isCompany)) {
          if (tab.id === 'documents') continue;
          // Element creation only — catches a config whose tab list and
          // renderTab switch drifted apart (returns null → blank tab).
          expect(config.renderTab(tab.id, ctx)).not.toBeNull();
        }
        expect(config.renderDocumentsSection(ctx)).not.toBeNull();
      },
    );
  },
);

describe('variant discriminators', () => {
  it('tenant/jointObligor/aval resolve company from their own type field', () => {
    expect(tenantWizardConfig.resolveContext({ tenantType: 'COMPANY' }).isCompany).toBe(true);
    expect(tenantWizardConfig.resolveContext({}).isCompany).toBe(false);
    expect(
      jointObligorWizardConfig.resolveContext({ jointObligorType: 'COMPANY' }).isCompany,
    ).toBe(true);
    expect(avalWizardConfig.resolveContext({ avalType: 'COMPANY' }).isCompany).toBe(true);
  });

  it('landlord self-scopes by selfId, falling back to primary then first', () => {
    const a = { id: 'a', isCompany: true, isPrimary: false };
    const b = { id: 'b', isCompany: false, isPrimary: true };
    const data = { landlords: [a, b] };

    // Token-holder wins (the #178 class: never key off the legacy primary).
    expect(landlordWizardConfig.resolveContext(data, 'a').self).toBe(a);
    expect(landlordWizardConfig.resolveContext(data, 'a').isCompany).toBe(true);

    // Admin flows without selfId fall back: primary, then first.
    expect(landlordWizardConfig.resolveContext(data, null).self).toBe(b);
    expect(landlordWizardConfig.resolveContext({ landlords: [a] }, null).self).toBe(a);
    expect(landlordWizardConfig.resolveContext({ landlords: [] }, null).self).toEqual({});
  });
});

describe('documents save payload', () => {
  it('tenant/jointObligor/aval submit additionalInfo; landlord submits nothing', () => {
    expect(tenantWizardConfig.getDocumentsSaveData('nota')).toEqual({ additionalInfo: 'nota' });
    expect(jointObligorWizardConfig.getDocumentsSaveData('nota')).toEqual({
      additionalInfo: 'nota',
    });
    expect(avalWizardConfig.getDocumentsSaveData('nota')).toEqual({ additionalInfo: 'nota' });
    expect(landlordWizardConfig.getDocumentsSaveData('nota')).toEqual({});
  });
});
