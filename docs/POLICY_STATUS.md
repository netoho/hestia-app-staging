# Policy Status Model

## Statuses

| Status | Description |
|---|---|
| `COLLECTING_INFO` | Initial state. Actor information and investigations in progress. |
| `PENDING_APPROVAL` | All actor investigations approved. Awaiting admin approval. |
| `ACTIVE` | Approved, payment completed, protection running. |
| `EXPIRED` | Contract period ended. Set automatically by daily cron. |
| `CANCELLED` | Terminated. Can happen from any non-terminal state. |

## Transitions

```
COLLECTING_INFO ──→ PENDING_APPROVAL ──→ ACTIVE ──→ EXPIRED
       │                    │                │
       └──→ CANCELLED ←────┘────────────────┘
```

### Allowed Transitions

```
COLLECTING_INFO  → PENDING_APPROVAL, CANCELLED
PENDING_APPROVAL → ACTIVE, COLLECTING_INFO, CANCELLED
ACTIVE           → EXPIRED, CANCELLED
EXPIRED          → CANCELLED
CANCELLED        → (none)
```

## Validation Gates

### COLLECTING_INFO → PENDING_APPROVAL
- All investigated actors (tenant, joint obligors, avals — not landlords) must have at least one `APPROVED` investigation.

### PENDING_APPROVAL → ACTIVE
- All active payments (excluding CANCELLED/FAILED) must be `COMPLETED`.
- On transition: sets `approvedAt`, `activatedAt`, and `expiresAt` (now + `contractLength` months).

### PENDING_APPROVAL → COLLECTING_INFO
- Allowed (revert). No special gate.

## Auto-Transitions

### COLLECTING_INFO → PENDING_APPROVAL
- **Trigger:** After an investigation is approved or an actor completes submission.
- **Logic:** `tryAutoTransition()` checks if all investigations are approved and transitions automatically.
- **Callers:** `investigation.router.ts` (on approval), `BaseActorService` (on actor completion).

### ACTIVE → EXPIRED
- **Trigger:** Daily cron job.
- **Logic:** `expireActivePolicies()` finds all `ACTIVE` policies where `expiresAt < now` and sets status to `EXPIRED`.
- **Cron:** `/api/cron/policy-expiry` — runs daily at 12:00 UTC (6:00 AM Mexico City).

## Cancellation

Any non-`CANCELLED` policy can be cancelled. Cancellation:
- Sets `status = CANCELLED`, `cancelledAt`, `cancellationReason`, `cancellationComment`.
- Clears `activatedAt` and `expiresAt`.
- Requires a `PolicyCancellationReason` enum value and a comment.

## Key Timestamps

| Field | Set When | Purpose |
|---|---|---|
| `submittedAt` | → PENDING_APPROVAL | When policy was submitted for review |
| `approvedAt` | → ACTIVE | When admin approved the policy |
| `activatedAt` | → ACTIVE | When protection started |
| `expiresAt` | → ACTIVE | When protection ends (now + contractLength) |
| `cancelledAt` | → CANCELLED | When policy was cancelled |

## Source Files

| File | Role |
|---|---|
| `src/lib/services/policyWorkflowService.ts` | Transition logic, validation, auto-transitions, expiry |
| `src/server/routers/policy.router.ts` | `updateStatus` endpoint (admin) |
| `src/lib/services/policyService/cancellation.ts` | Cancellation logic |
| `src/app/api/cron/policy-expiry/route.ts` | Daily expiry cron |
| `src/lib/config/policyStatus.ts` | Status labels and filter config |
| `src/lib/i18n/statuses.ts` | Display names (Spanish) |
| `prisma/schema.prisma` | `PolicyStatus` enum definition |
