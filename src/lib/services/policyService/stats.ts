import prisma from '@/lib/prisma';
import { PolicyStatus } from '@/prisma/generated/prisma-client/enums';

export interface DashboardStatsScope {
  /** Restrict counts to policies managed by this user. Used for BROKER. */
  managedById?: string;
}

export interface DashboardStats {
  active: number;
  pendingApproval: number;
  inProcess: number;
  expired: number;
}

const TERMINAL_OR_KNOWN_BUCKETS: PolicyStatus[] = [
  PolicyStatus.ACTIVE,
  PolicyStatus.PENDING_APPROVAL,
  PolicyStatus.EXPIRED,
  PolicyStatus.CANCELLED,
];

export async function getDashboardStats(scope: DashboardStatsScope = {}): Promise<DashboardStats> {
  const baseWhere = scope.managedById ? { managedById: scope.managedById } : {};

  const [active, pendingApproval, inProcess, expired] = await Promise.all([
    prisma.policy.count({ where: { ...baseWhere, status: PolicyStatus.ACTIVE } }),
    prisma.policy.count({ where: { ...baseWhere, status: PolicyStatus.PENDING_APPROVAL } }),
    prisma.policy.count({ where: { ...baseWhere, status: { notIn: TERMINAL_OR_KNOWN_BUCKETS } } }),
    prisma.policy.count({ where: { ...baseWhere, status: PolicyStatus.EXPIRED } }),
  ]);

  return { active, pendingApproval, inProcess, expired };
}

export interface RecentPoliciesScope extends DashboardStatsScope {
  limit?: number;
}

export async function getRecentPolicies(scope: RecentPoliciesScope = {}) {
  const limit = scope.limit ?? 5;
  const baseWhere = scope.managedById ? { managedById: scope.managedById } : {};

  return prisma.policy.findMany({
    where: {
      ...baseWhere,
      status: { not: PolicyStatus.EXPIRED },
    },
    select: {
      id: true,
      policyNumber: true,
      rentAmount: true,
      status: true,
      updatedAt: true,
      tenant: {
        select: {
          firstName: true,
          paternalLastName: true,
          maternalLastName: true,
          companyName: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });
}
