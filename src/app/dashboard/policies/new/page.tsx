'use client';

import PolicyCreationWizard from '@/components/policies/create/PolicyCreationWizard';

/**
 * New policy creation page
 * Now uses the refactored PolicyCreationWizard component with tRPC
 *
 * Previously: 1,715 lines in a single file
 * Now: Clean component-based architecture with tRPC integration
 */
export default function NewPolicyPage() {
  return <PolicyCreationWizard />;
}