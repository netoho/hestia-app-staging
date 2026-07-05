/**
 * Landlord schema — re-export shim.
 *
 * The canonical landlord schema now lives in the hexagonal domain layer
 * at `@/lib/domain/landlord/schema` (S2, issue #130). This file re-exports
 * it so existing importers keep working unchanged. New code should import
 * from `@/lib/domain/landlord/schema` directly. The shim is removed in the
 * post-S6 cleanup once every consumer has migrated.
 */

export * from '@/lib/domain/landlord/schema';
