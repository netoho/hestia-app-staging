/**
 * Document output schemas — re-export shim.
 *
 * The canonical document schema + output shapes now live in the hexagonal
 * domain layer at `@/lib/domain/document/adapters/api` (S6a, issue #134). This
 * file re-exports them so existing importers (the router + tests) keep working
 * unchanged. New code should import from the domain path directly. Removed in
 * the post-S6 cleanup.
 */

export * from '@/lib/domain/document/adapters/api';
