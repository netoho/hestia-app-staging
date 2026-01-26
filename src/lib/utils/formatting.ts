/**
 * Date formatting utilities
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
