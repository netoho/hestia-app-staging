# Hestia Backlog

**Last Updated**: December 2024

Unified backlog of pending work items across the codebase.

---

## Critical (Pre-Production)

### 1. Payment/Stripe Implementation
**Location**: `src/server/routers/payment.router.ts:8-12`

Implement payment procedures:
- [ ] Create Stripe checkout session
- [ ] Create Stripe payment intent
- [ ] Get payment status by ID
- [ ] Handle Stripe webhooks (in API route)

### 2. BROKER Authorization Fix
**Location**: `src/app/api/README.md:29-31`

- [ ] BROKER role can currently access other brokers' policies
- [ ] Implement proper ownership checks

### 3. Rate Limiting
**Location**: `src/app/api/README.md:31`

- [ ] Implement rate limiting on API endpoints
- [ ] Consider using middleware or edge functions

---

## High Priority

### 4. S3 File Storage Integration
**Location**: `src/app/api/_deprecated/policies/[id]/contracts/upload/route.ts:90`

- [ ] Complete S3 upload implementation
- [ ] Currently uses placeholder S3 key

### 5. PDF Contract Generation
**Location**: `src/app/api/_deprecated/policies/[id]/contract/route.ts:128`

- [ ] Generate actual PDF contract using template engine
- [ ] Currently creates placeholder buffer

### 6. Password Reset Confirmation Email
**Location**: `src/app/api/auth/reset-password/[token]/route.ts:166-170`

- [ ] Implement confirmation email template
- [ ] Add to emailService

### 7. Migrate Legacy Tenant API
**Location**: `src/app/api/tenant/` -> `src/app/api/actor/tenant/`

- [ ] Migrate `/tenant/` endpoints to `/actor/tenant/`
- [ ] Update frontend references
- [ ] Deprecate old endpoints

---

## Medium Priority

### 8. Joint Obligor Income Validation
**Location**: `src/lib/services/actors/JointObligorService.ts:586`

- [ ] Validate minimum income rule with business
- [ ] Currently commented out pending confirmation

### 9. Toast Notification System
**Location**: `src/lib/utils/optimisticUpdates.ts:213,221`

- [ ] Replace console.log/error with actual toast implementation
- [ ] Integrate with UI notification system

### 10. E2E Testing Pipeline
**Location**: `.github/workflows/e2e.yml:2`

- [ ] Enable E2E testing workflow
- [ ] Configure CI pipeline

### 11. Integration Tests
**Location**: `src/app/api/README.md:85-91`

- [ ] Add integration tests for API endpoints
- [ ] Set up testing infrastructure

---

## Deferred

### 12. Type Safety in Dynamic Prisma Access
**Location**: `docs/CODE_QUALITY_PLAN.md:78-84`

Dynamic Prisma model access and actor type unions:
- `validationService.ts` lines 523, 680: Dynamic `prisma[model]` access
- `validationService.ts` lines 559-566, 583, 592, 623, 633, 638: Actor type unions

**Note**: Works correctly, just lacks compile-time types. Address in future refactor.

---

## Cleanup Tasks

### Delete Deprecated Folder
**Location**: `src/app/api/_deprecated/`

- 32 files, ~220KB
- Keep for reference until migration complete
- Separate cleanup task

### AWS S3 Avatar Deletion
**Location**: `src/server/routers/user.router.ts:248`

- [ ] Implement AWS S3 delete when removing user avatars
- [ ] Currently only updates database

---

## Priority Summary

| Priority | Count | Status |
|----------|-------|--------|
| Critical | 3 | Blocks production |
| High | 4 | MVP requirements |
| Medium | 4 | Nice to have |
| Deferred | 1 | Future refactor |
| Cleanup | 2 | Separate tasks |

---

## Related Documentation

- [Code Quality Plan](CODE_QUALITY_PLAN.md) - Type safety improvements
- [Developer Onboarding](DEVELOPER_ONBOARDING.md) - Setup and common tasks
- [API README](../src/app/api/README.md) - API-specific TODOs
