/**
 * Shared payment-notification recipient builders. A tenant-side payment notifies
 * every tenant of the policy; a landlord-side payment notifies every landlord
 * (primary + co-owners). Extracted from the Stripe webhook so the payment-
 * confirmation and CFDI-portal (#214) fan-outs resolve recipients identically.
 */
export type EmailRecipient = { email: string; name: string };

export type TenantEmailFields = {
  email: string;
  companyName?: string | null;
  firstName?: string | null;
  paternalLastName?: string | null;
  maternalLastName?: string | null;
};

export type LandlordEmailFields = {
  email: string;
  isCompany?: boolean | null;
  companyName?: string | null;
  firstName?: string | null;
  paternalLastName?: string | null;
  maternalLastName?: string | null;
};

export function tenantEmailName(t: TenantEmailFields): string {
  if (t.companyName) return t.companyName;
  return `${t.firstName || ''} ${t.paternalLastName || ''} ${t.maternalLastName || ''}`.trim();
}

export function landlordEmailName(l: LandlordEmailFields): string {
  if (l.isCompany && l.companyName) return l.companyName;
  return `${l.firstName || ''} ${l.paternalLastName || ''} ${l.maternalLastName || ''}`.trim();
}

/** Every tenant of the policy with a non-empty email. */
export function buildTenantRecipients(tenants: TenantEmailFields[]): EmailRecipient[] {
  return tenants.filter((t) => t.email).map((t) => ({ email: t.email, name: tenantEmailName(t) }));
}

/** Every landlord of the policy (primary + co-owners) with a non-empty email. */
export function buildLandlordRecipients(landlords: LandlordEmailFields[]): EmailRecipient[] {
  return landlords.filter((l) => l.email).map((l) => ({ email: l.email, name: landlordEmailName(l) }));
}
