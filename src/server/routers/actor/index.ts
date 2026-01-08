/**
 * Actor Router
 *
 * Combined router for all actor-related endpoints.
 * Split into:
 * - shared.router.ts: Generic endpoints that work for all actor types
 * - landlord.router.ts: Landlord-specific endpoints (property details, co-ownership, etc.)
 */

import { createTRPCRouter } from '@/server/trpc';
import { sharedActorRouter } from './shared.router';
import { landlordRouter } from './landlord.router';

// Combine routers using nested routing (tRPC v11 approach)
// All shared endpoints are at actor.*, landlord-specific at actor.landlord.*
// To maintain flat structure, we spread procedures manually
export const actorRouter = createTRPCRouter({
  // Spread shared procedures
  ...sharedActorRouter._def.procedures,
  // Spread landlord procedures
  ...landlordRouter._def.procedures,
});

// Re-export utilities for use by other routers if needed
export {
  ActorTypeSchema,
  getActorService,
  LAST_TABS,
} from './shared.router';
