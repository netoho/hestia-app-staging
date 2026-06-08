/**
 * Aval schema — re-export shim.
 *
 * The canonical aval schema now lives in the hexagonal domain layer at
 * `@/lib/domain/aval/schema` (S3, issue #131). This file re-exports it so
 * existing importers keep working unchanged. New code should import from
 * `@/lib/domain/aval/schema` directly. Removed in the post-S6 cleanup.
 */

export * from '@/lib/domain/aval/schema';
