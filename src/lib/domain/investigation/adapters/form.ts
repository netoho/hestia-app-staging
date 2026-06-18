/**
 * Form adapter for the Investigation entity. Investigations have no actor-facing
 * multi-tab form; staff supply `findings`, approvers supply approval/rejection
 * notes. Exposed via `.pick` on the canonical schema for recipe consistency.
 */

import { investigationSchema } from '../schema';

/** Fields staff/approvers edit on an investigation. */
export const investigationEditableFields = investigationSchema
  .pick({ findings: true, status: true, approvalNotes: true, rejectionReason: true })
  .keyof().options;
