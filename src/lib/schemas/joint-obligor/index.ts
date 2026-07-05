/**
 * Joint Obligor schema — re-export shim.
 *
 * The canonical joint-obligor schema now lives in the hexagonal domain layer
 * at `@/lib/domain/joint-obligor/schema` (S4b, issue #132). This file re-exports
 * it so existing importers keep working unchanged. New code should import from
 * `@/lib/domain/joint-obligor/schema` directly. Removed in the post-S6 cleanup.
 */

export * from '@/lib/domain/joint-obligor/schema';
