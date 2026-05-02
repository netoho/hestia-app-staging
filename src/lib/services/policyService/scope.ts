import type { UserRole } from '@/prisma/generated/prisma-client/enums';

/**
 * Broker policy-scoping helper.
 *
 * `Policy.managedById` tracks the broker who owns the deal. Brokers should
 * only see policies where they're the assigned manager — both policies they
 * created themselves (auto-assigned in `createPolicy`) and policies that
 * ADMIN/STAFF assigned to them via the picker.
 *
 * Returns a partial Prisma `where` clause; callers spread it into the rest
 * of their filter. ADMIN/STAFF gets `{}` (no scoping — they see everything).
 */
export function brokerScopeWhere(
  role: UserRole | undefined,
  userId: string,
): { managedById?: string } {
  return role === 'BROKER' ? { managedById: userId } : {};
}
