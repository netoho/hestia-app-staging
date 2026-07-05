# Actor Services

CRUD + business logic for the four actor types (Tenant, Landlord, Aval, JointObligor).
Inheritance pattern: `BaseActorService<T>` provides the shared machinery; concrete
services add actor-specific rules. Since the #123 hexagonal sweep, **all four services
write through the domain adapters** (`<entity>ToDb` from
`src/lib/domain/<entity>/adapters/db.ts`) and read through the domain selects
(`<entity>Select` from `src/lib/domain/<entity>/select.ts`).

## Files

- **BaseActorService.ts** — abstract base (validation wrap, address upsert, references,
  save pipeline, token reads, submit/force-complete, activity log, auto status transition)
- **TenantService.ts / LandlordService.ts / AvalService.ts / JointObligorService.ts**
- **types.ts** — shared actor types; **index.ts** — singletons + `getServiceForType(type)`

```
BaseService (../base/)
  ↓
BaseActorService<T> (abstract)
  ├─> LandlordService   ├─> AvalService
  ├─> TenantService     └─> JointObligorService
```

## Real public surface (verified against source — don't trust older copies of this doc)

### `BaseActorService<T>` (BaseActorService.ts)

| Method | Line | Notes |
|---|---|---|
| `getById(id)` | :627 | uses the domain select |
| `getByToken(token)` | :635 | portal read; checks `tokenExpiry` only (policy-status invalidation is #165) |
| `update(...)` | :667 | the tab-save path — tab names gated via `getTabFields` (`shared.router.ts:537`) |
| `submitActor(...)` | :703 | submit/force-complete; `skipValidation` skips completeness AND required docs |
| `savePersonalReferences(...)` | :206 | |
| `saveCommercialReferences(...)` | :261 | |
| `save(...)` | :845 | abstract — each service implements the full-save |

Protected helpers (used by subclasses, not callable outside): `validateActorData`,
`upsertAddress`/`upsertMultipleAddresses`, `buildUpdateData`, `saveActorData`,
`getActorById`, `isInformationComplete`, `logActivity`,
`checkAndTransitionPolicyStatus`, `deleteActor`.

> There is **no** `BaseActorService.create/findById/findByPolicyId/delete` public
> API, no `TenantService.validateReferences/calculateIncomeRatio`, no
> `AvalService.validatePropertyGuarantee/calculatePropertyValue`, no
> `JointObligorService.validateIncomeRequirement`, no
> `LandlordService.findPrimaryLandlord/setPrimaryLandlord` (primary-landlord is a
> legacy concept — every landlord is first-class). Earlier versions of this README
> documented those; they never survived to the current code.

### Per-service additions

| Service | Extra public methods |
|---|---|
| `TenantService` | `save` :101, `delete` :320 |
| `LandlordService` | `saveLandlordInformation` :133, `saveFinancialDetails` :162, `savePropertyDetails` :196, `getManyByToken` :473, `save` :683, `delete` :722, `submitAllLandlords` :790 |
| `AvalService` | `saveAvalInformation` :81, `saveGuaranteePropertyAddress` :259, reference savers, `save` :565, `delete` :579 |
| `JointObligorService` | `saveJointObligorInformation` :94, `saveEmployerAddress` :250, `saveGuaranteePropertyAddress` :284, reference savers, `save` :595, `delete` :609 |

(Line numbers drift — treat as anchors, `grep -n "public async"` for the current truth.)

## The write path (post-hex)

```
router input → domain toDb() [normalize → validate → transform] → prisma upsert
                                     ↑
                     canonical schema (src/lib/domain/<entity>/schema.ts)
```

- Tab saves filter fields by the `.keyof()`-derived tab lists from
  `adapters/form.ts` — a field added to the canonical tab schema flows to the write
  path automatically.
- All methods return `Result<T, ServiceError>` / `AsyncResult<T>` — no throws across
  the service boundary.
- Known gap: `LandlordService.buildUpdateData` still bypasses `landlordToDb` for
  single-actor updates (#152).

## Consumers

`src/server/routers/actor/{shared,landlord}.router.ts` (all portal + admin actor
operations), `policyService` flows (creation, renewal — note renewal's hand-built
copy lists, #159), `progressService`, investigation gates.
