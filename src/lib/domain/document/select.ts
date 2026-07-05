/**
 * Centralized Prisma include for ActorDocument. Documents are a LEAF entity —
 * nothing is loaded alongside them (the actor links are scalar FK columns), so
 * the include is empty. Present for recipe consistency + the WithRelations type.
 */

import { Prisma } from '@/prisma/generated/prisma-client/client';

export const documentSelect = {} satisfies Prisma.ActorDocumentInclude;

export type DocumentWithRelations = Prisma.ActorDocumentGetPayload<{
  include: typeof documentSelect;
}>;
