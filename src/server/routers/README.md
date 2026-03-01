# tRPC Routers

All routers are combined in `_app.ts` (the root router). Each file exposes a `createTRPCRouter` and delegates business logic to services in `src/lib/services/`.

## Directory Structure

```
routers/
├── _app.ts                  # Root router — combines all routers
├── actor/
│   ├── index.ts             # Merges shared + landlord routers into actorRouter
│   ├── shared.router.ts     # Generic procedures for all actor types (tenant, landlord, aval, jointObligor)
│   └── landlord.router.ts   # Landlord-specific procedures (property details, co-ownership)
├── address.router.ts
├── contract.router.ts
├── document.router.ts
├── investigation.router.ts
├── onboard.router.ts
├── package.router.ts
├── payment.router.ts
├── policy.router.ts
├── pricing.router.ts
├── receipt.router.ts
├── staff.router.ts
└── user.router.ts
```

## Router Catalog

| Router | tRPC namespace | Description |
|---|---|---|
| `actor/` | `actor.*` | Actor self-service portal: get by token, save tab, full save, admin update, validate documents |
| `address.router.ts` | `address.*` | Google Places autocomplete and place detail lookup |
| `contract.router.ts` | `contract.*` | Contract retrieval by policy (stub, minimal implementation) |
| `document.router.ts` | `document.*` | S3 presigned upload URLs and document status confirmation for actor documents |
| `investigation.router.ts` | `investigation.*` | Tenant investigation flow: create, submit form, request/record approvals |
| `onboard.router.ts` | `onboard.*` | Staff onboarding via invitation token: validate token, set password, upload avatar |
| `package.router.ts` | `package.*` | Service package CRUD (admin) and public listing |
| `payment.router.ts` | `payment.*` | List payments, generate Stripe checkout sessions, record manual payments |
| `policy.router.ts` | `policy.*` | Proteccion CRUD, status transitions, tenant replacement, guarantor type change, cancellation, share links |
| `pricing.router.ts` | `pricing.*` | Price calculation and price override (admin) |
| `receipt.router.ts` | `receipt.*` | Monthly receipt portal: validate tenant token, list receipts, upload/confirm receipts |
| `staff.router.ts` | `staff.*` | Staff user management: list, create, update, deactivate, resend invitation (admin only) |
| `user.router.ts` | `user.*` | Current user profile, password change, avatar presigned URL |

## Actor Subdirectory

The actor router is split to keep files manageable:

- **`shared.router.ts`** — procedures that work for all four actor types (`tenant`, `landlord`, `aval`, `jointObligor`): token validation, tab save, full save, admin update, document validation.
- **`landlord.router.ts`** — landlord-only procedures: save multiple landlords for a policy, property details.
- **`index.ts`** — merges both using `_def.procedures` spread so all procedures appear flat under `actor.*`.
