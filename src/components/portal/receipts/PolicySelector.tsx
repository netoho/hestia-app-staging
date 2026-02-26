'use client';

interface PolicyInfo {
  policyId: string;
  policyNumber: string;
  propertyAddress: {
    street?: string | null;
    exteriorNumber?: string | null;
  } | null;
}

interface PolicySelectorProps {
  policies: PolicyInfo[];
  selectedPolicyId: string;
  onSelect: (policyId: string) => void;
}

export default function PolicySelector({
  policies,
  selectedPolicyId,
  onSelect,
}: PolicySelectorProps) {
  if (policies.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
      {policies.map(policy => {
        const isActive = policy.policyId === selectedPolicyId;
        const addressSnippet = policy.propertyAddress
          ? [policy.propertyAddress.street, policy.propertyAddress.exteriorNumber && `#${policy.propertyAddress.exteriorNumber}`]
              .filter(Boolean)
              .join(' ')
          : '';

        return (
          <button
            key={policy.policyId}
            type="button"
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              isActive
                ? 'text-white border-transparent'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
            style={isActive ? { backgroundColor: '#173459' } : undefined}
            onClick={() => onSelect(policy.policyId)}
          >
            <span>#{policy.policyNumber}</span>
            {addressSnippet && (
              <span className={`ml-1 ${isActive ? 'text-blue-200' : 'text-gray-400'}`}>
                — {addressSnippet}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
