/**
 * Formatting utilities
 */

/**
 * Format date as yyyy-mm-dd
 * Example: "2026-01-24"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date and time as yyyy-mm-dd HH:mm
 * Example: "2026-01-24 14:30"
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Format date in long Spanish format
 * Example: "viernes, 24 de enero de 2026"
 */
export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format date and time in long Spanish format
 * Example: "viernes, 24 de enero de 2026, 14:30"
 */
export function formatDateTimeLong(date: Date | string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Address fields used by formatAddress
 */
export interface AddressFields {
  street?: string | null;
  exteriorNumber?: string | null;
  interiorNumber?: string | null;
  neighborhood?: string | null;
  postalCode?: string | null;
  municipality?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  formattedAddress?: string | null;
}

/**
 * Format a structured address into a readable string.
 * Example: "Av. Reforma #123 Int. 4, Juárez, C.P. 06600, Cuauhtémoc, Ciudad de México, CDMX"
 */
export function formatAddress(addr: AddressFields | null | undefined): string {
  if (!addr) return '-';

  if (addr.formattedAddress) return addr.formattedAddress;

  const line1 = [
    addr.street,
    addr.exteriorNumber ? `#${addr.exteriorNumber}` : null,
    addr.interiorNumber ? `Int. ${addr.interiorNumber}` : null,
  ].filter(Boolean).join(' ');

  const line2 = [
    addr.neighborhood,
    addr.postalCode ? `C.P. ${addr.postalCode}` : null,
  ].filter(Boolean).join(', ');

  const line3Parts = [addr.municipality, addr.city, addr.state].filter(Boolean);
  const line3 = line3Parts.filter((v, i) => v !== line3Parts[i - 1]).join(', ');

  const formatted = [line1, line2, line3].filter(Boolean).join(', ');
  return formatted || '-';
}

/**
 * Format file size in human readable format
 * Example: 1024 → "1.0 KB", 1048576 → "1.0 MB"
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
