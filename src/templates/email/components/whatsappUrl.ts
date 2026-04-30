/**
 * Build a wa.me link with a pre-filled message.
 * Uses NEXT_PUBLIC_WHATSAPP_NUMBER; returns null if unset so callers can skip the CTA.
 * Mirrors the pattern in src/lib/hooks/useShareLinks.ts:84-93.
 */
export function buildWhatsAppUrl(message: string): string | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
