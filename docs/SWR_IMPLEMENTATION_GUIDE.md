# SWR Integration Phase 5 - Implementation Guide

## Overview
This document describes the implementation of real-time updates and SWR integration for the Hestia backoffice Phase 5 optimization.

## Completed Tasks

### 1. SWR Package Installation
- Installed `swr@2.3.6` package
- Location: `package.json`

### 2. SWR Configuration
Created global SWR configuration with optimal settings:
- **File**: `/Users/neto/Development/hestia-app/src/lib/config/swrConfig.ts`
- **Features**:
  - Default fetcher with error handling
  - Revalidation on focus and reconnect
  - 30-second refresh interval for real-time updates
  - Deduplication and retry logic
  - Specialized configs for policies, progress, and activities

### 3. Data Fetching Hooks

#### usePolicyData.ts
**Location**: `/Users/neto/Development/hestia-app/src/lib/hooks/usePolicyData.ts`

**Features**:
- Automatic real-time data fetching with 30s intervals
- Optimistic updates for policy status changes
- Actor verification with optimistic UI updates
- Automatic rollback on errors
- Invitation sending with data refresh

**Usage Example**:
```typescript
const {
  policy,
  isLoading,
  error,
  updatePolicyStatus,
  verifyActor,
  sendInvitations,
  refresh
} = usePolicyData(policyId);

// Approve actor with optimistic update
await verifyActor('tenant', tenantId, 'approve');

// Update policy status
await updatePolicyStatus('APPROVED');
```

#### useActorProgress.ts
**Location**: `/Users/neto/Development/hestia-app/src/lib/hooks/useActorProgress.ts`

**Features**:
- Real-time progress tracking for all actors
- Percentage completion calculations
- Document upload progress
- Actor-specific statistics
- Expiring token detection (7-day warning)

**Usage Example**:
```typescript
const {
  stats,
  getActorProgress,
  allActorsComplete,
  pendingActors,
  actorsWithExpiringTokens
} = useActorProgress(policyId);

// Get specific actor progress
const landlordProgress = getActorProgress(landlordId);
console.log(`Landlord: ${landlordProgress.percentage}% complete`);
```

#### usePolicyActivities.ts
**Location**: `/Users/neto/Development/hestia-app/src/lib/hooks/usePolicyActivities.ts`

**Features**:
- Activity timeline with automatic refresh
- Filtering by actor type or ID
- Grouping activities by date
- Recent activities view
- Activity count statistics

**Usage Example**:
```typescript
const {
  activities,
  activitiesByDate,
  recentActivities,
  activityCounts
} = usePolicyActivities(policyId, {
  actorType: 'tenant',
  limit: 10
});
```

### 4. Optimistic Update Utilities
**Location**: `/Users/neto/Development/hestia-app/src/lib/utils/optimisticUpdates.ts`

**Features**:
- Generic optimistic update helper
- Actor verification status updates
- Policy status updates
- Actor completion flag updates
- Document upload optimistic additions
- Automatic rollback on errors
- Debounce and throttle utilities

**Usage Example**:
```typescript
import { performOptimisticUpdate, updateActorVerificationStatus } from '@/lib/utils/optimisticUpdates';

await performOptimisticUpdate({
  mutate,
  currentData: policy,
  updateFn: (data) => updateActorVerificationStatus(data, 'tenant', tenantId, 'APPROVED'),
  apiCall: () => fetch(`/api/policies/${policyId}/actors/tenant/${tenantId}/verify`, {
    method: 'POST',
    body: JSON.stringify({ action: 'approve' })
  }),
  successMessage: 'Actor approved successfully',
  errorMessage: 'Failed to approve actor'
});
```

## Integration with PolicyDetailsPage

### Current State
The PolicyDetailsPage has been enhanced with:
- Error boundaries for graceful error handling
- Skeleton loading states
- Improved error states with retry functionality
- Tab transition animations
- Button hover effects and transitions

### Recommended Next Steps for Full SWR Integration

To fully integrate the SWR hooks into the PolicyDetailsPage, follow these steps:

1. **Replace useState/useEffect with SWR hooks**:
```typescript
// Instead of:
const [policy, setPolicy] = useState<PolicyDetails | null>(null);
const [loading, setLoading] = useState(true);

// Use:
const { policy, isLoading, error, updatePolicyStatus, verifyActor, sendInvitations } = usePolicyData(policyId);
const { stats, allActorsComplete } = useActorProgress(policyId);
```

2. **Update Action Handlers**:
```typescript
// Approve actor with optimistic update
const approveActor = async (actorType: string, actorId: string) => {
  try {
    await verifyActor(actorType, actorId, 'approve');
    // Toast notification here
  } catch (error) {
    // Error handling
  }
};

// Reject actor
const rejectActor = async (actorType: string, actorId: string, reason: string) => {
  try {
    await verifyActor(actorType, actorId, 'reject', reason);
  } catch (error) {
    // Error handling
  }
};

// Approve policy
const approvePolicy = async () => {
  if (!confirm('¿Estás seguro de que deseas aprobar esta protección?')) return;

  try {
    await updatePolicyStatus('APPROVED');
  } catch (error) {
    // Error handling
  }
};
```

3. **Send Invitations**:
```typescript
const handleSendInvitations = async () => {
  try {
    setSending('all');
    await sendInvitations();
    // Success notification
  } catch (error) {
    // Error notification
  } finally {
    setSending(null);
  }
};
```

## Benefits of SWR Implementation

### 1. Real-time Updates
- Automatic data refresh every 30 seconds
- Always shows current policy state
- No manual refresh needed

### 2. Optimistic UI Updates
- Instant feedback on user actions
- Improved perceived performance
- Automatic rollback on errors

### 3. Better Error Handling
- Automatic retry on failure
- Graceful degradation
- User-friendly error messages

### 4. Reduced Network Load
- Deduplication of requests
- Caching for 5 minutes
- Smart revalidation strategy

### 5. Improved User Experience
- Faster perceived loading times
- Smoother interactions
- Real-time progress tracking

## Configuration

### Refresh Intervals
- **Policy Data**: 30 seconds
- **Progress Data**: 30 seconds
- **Activities**: 60 seconds

### Cache Duration
- Default: 5 minutes
- Focus revalidation: Enabled
- Reconnect revalidation: Enabled

### Retry Logic
- Max retries: 3
- Retry interval: 5 seconds
- Exponential backoff: Yes

## Testing

To test the implementation:

```bash
bun run dev
```

Navigate to a policy details page and observe:
1. Data loads initially
2. Updates appear automatically every 30 seconds
3. Actions (approve, reject) show optimistic updates
4. Errors trigger automatic rollback
5. Focus switching revalidates data

## Migration Path

For existing code using direct fetch calls:

**Before**:
```typescript
const fetchPolicy = async () => {
  const response = await fetch(`/api/policies/${id}`);
  const data = await response.json();
  setPolicy(data);
};

useEffect(() => {
  fetchPolicy();
}, [id]);
```

**After**:
```typescript
const { policy, isLoading } = usePolicyData(id);
```

## Performance Considerations

1. **Bundle Size**: SWR adds ~5KB gzipped
2. **Memory**: Cached data is automatically cleared after 5 minutes
3. **Network**: Requests are deduplicated and cached
4. **CPU**: Minimal overhead from revalidation logic

## Future Enhancements

1. **WebSocket Integration**: For true real-time updates
2. **Infinite Loading**: For activities timeline
3. **Pagination**: For large data sets
4. **Prefetching**: For faster navigation
5. **Optimistic Mutations**: For more actions

## Troubleshooting

### Issue: Data not updating
**Solution**: Check refresh interval in swrConfig.ts

### Issue: Optimistic updates not rolling back
**Solution**: Ensure error handling in optimisticUpdates.ts is correct

### Issue: Too many requests
**Solution**: Increase dedupingInterval in swrConfig.ts

### Issue: Stale data shown
**Solution**: Call `refresh()` or `mutate()` manually

## API Requirements

For SWR to work correctly, ensure APIs return:
1. Consistent data structures
2. Proper HTTP status codes
3. Error messages in JSON format
4. Support for conditional requests (ETag, Last-Modified)

## Conclusion

The SWR integration provides a solid foundation for real-time data updates with optimistic UI patterns. The implementation is modular, type-safe, and follows React best practices.

All hooks are ready to use and can be gradually integrated into existing components without breaking changes.
