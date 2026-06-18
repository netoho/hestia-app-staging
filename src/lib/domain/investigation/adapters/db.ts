/**
 * DB adapter for the Investigation entity. Investigations are created/updated
 * inline in the (service-less) investigation router via typed Prisma calls —
 * there is no form-input transformation to normalize here. This adapter exposes
 * the small lifecycle helper the router (and tests) can share.
 */

import { ActorInvestigationStatus } from '@/prisma/generated/prisma-client/enums';
import { INVESTIGATION_TERMINAL_STATUSES } from '../schema';

/** True once an investigation has reached a terminal lifecycle state. */
export function isTerminalStatus(status: ActorInvestigationStatus): boolean {
  return (INVESTIGATION_TERMINAL_STATUSES as readonly ActorInvestigationStatus[]).includes(status);
}
