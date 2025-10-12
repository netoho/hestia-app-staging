import { useMemo } from 'react';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'BROKER';
  name?: string;
}

interface Policy {
  id: string;
  createdById: string;
  status: string;
}

export interface PolicyPermissions {
  canView: boolean;
  canEdit: boolean;
  canApprove: boolean;
  canDelete: boolean;
  canSendInvitations: boolean;
  canViewDocuments: boolean;
  canVerifyDocuments: boolean;
  canViewActivities: boolean;
  canEditActors: boolean;
}

/**
 * Hook to calculate user permissions for a specific policy
 *
 * Permission Matrix:
 *
 * | Action               | ADMIN | STAFF | BROKER (Owner) | BROKER (Non-Owner) |
 * |---------------------|-------|-------|----------------|-------------------|
 * | View Policy         | ✓     | ✓     | ✓              | ✗                 |
 * | Edit Policy         | ✓     | ✓     | ✓              | ✗                 |
 * | Approve Policy      | ✓     | ✓     | ✗              | ✗                 |
 * | Delete Policy       | ✓     | ✗     | ✗              | ✗                 |
 * | Send Invitations    | ✓     | ✓     | ✓              | ✗                 |
 * | View Documents      | ✓     | ✓     | ✓              | ✗                 |
 * | Verify Documents    | ✓     | ✓     | ✗              | ✗                 |
 * | View Activities     | ✓     | ✓     | ✓              | ✗                 |
 * | Edit Actors         | ✓     | ✓     | ✓              | ✗                 |
 */
export function usePolicyPermissions(
  user: User | null | undefined,
  policy: Policy | null | undefined
): PolicyPermissions {
  return useMemo(() => {
    // No user or policy - no permissions
    if (!user || !policy) {
      return {
        canView: false,
        canEdit: false,
        canApprove: false,
        canDelete: false,
        canSendInvitations: false,
        canViewDocuments: false,
        canVerifyDocuments: false,
        canViewActivities: false,
        canEditActors: false,
      };
    }

    const isOwner = policy.createdById === user.id;
    const isAdmin = user.role === 'ADMIN';
    const isStaff = user.role === 'STAFF';
    const isBroker = user.role === 'BROKER';

    // ADMIN has all permissions
    if (isAdmin) {
      return {
        canView: true,
        canEdit: true,
        canApprove: true,
        canDelete: true,
        canSendInvitations: true,
        canViewDocuments: true,
        canVerifyDocuments: true,
        canViewActivities: true,
        canEditActors: true,
      };
    }

    // STAFF has most permissions except delete
    if (isStaff) {
      return {
        canView: true,
        canEdit: true,
        canApprove: true,
        canDelete: false,
        canSendInvitations: true,
        canViewDocuments: true,
        canVerifyDocuments: true,
        canViewActivities: true,
        canEditActors: true,
      };
    }

    // BROKER permissions depend on ownership
    if (isBroker && isOwner) {
      return {
        canView: true,
        canEdit: true,
        canApprove: false,
        canDelete: false,
        canSendInvitations: true,
        canViewDocuments: true,
        canVerifyDocuments: false,
        canViewActivities: true,
        canEditActors: true,
      };
    }

    // BROKER without ownership has no permissions
    return {
      canView: false,
      canEdit: false,
      canApprove: false,
      canDelete: false,
      canSendInvitations: false,
      canViewDocuments: false,
      canVerifyDocuments: false,
      canViewActivities: false,
      canEditActors: false,
    };
  }, [user, policy]);
}

/**
 * Helper to check if user is staff or admin
 */
export function useIsStaffOrAdmin(user: User | null | undefined): boolean {
  return useMemo(() => {
    if (!user) return false;
    return user.role === 'ADMIN' || user.role === 'STAFF';
  }, [user]);
}

/**
 * Helper to check if user can view verification tab
 */
export function useCanViewVerification(
  user: User | null | undefined,
  policy: Policy | null | undefined
): boolean {
  const permissions = usePolicyPermissions(user, policy);
  return permissions.canApprove || permissions.canVerifyDocuments;
}
