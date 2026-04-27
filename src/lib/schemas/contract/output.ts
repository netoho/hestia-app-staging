/**
 * Output schemas for contract.* tRPC procedures.
 *
 * The contract router is a placeholder today — `getByPolicy` returns `null`.
 * The contract is locked at `null` so any future implementation that returns
 * a row must update the schema (and therefore the frontend type).
 */

import { z } from 'zod';

// ===========================================================================
// contract.getByPolicy
// ===========================================================================
export const ContractGetByPolicyOutput = z.null();
export type ContractGetByPolicyOutput = z.infer<typeof ContractGetByPolicyOutput>;
