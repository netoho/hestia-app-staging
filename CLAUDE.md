# Important notes
- We should use 'protección' instead of 'póliza', inside the codebase it is ok to use 'policy' but when talking to the client or in the UI we should use 'protección'.
- We use bun, so you can check the build with `bun run build`.
- When looking at ENUMs or data that is both on the codebase and on the schema, remember to use always the schema, if there is a conflict always ask for clarification.
- Don't run migrations automatically never, tell us about them and we will run them manually.
- Don't put everything in a single file, split things in logical parts. For business logic add the routers, services, utils, etc. For components add folders and split them in smaller components.
- When creating new components, prefer functional components with hooks over class components.
- Always look for existing components or utilities before creating new ones.
- We deploy on vercel so take than into account, for example avoid uploading large files directly to the server. Use the services (s3 presigned urls, etc) instead.

## Testing
- Look at the main @README.md file for guidance.
- @docs/DEVELOPER_ONBOARDING.md, @docs/TESTING.md and @tests/integration/README.md will be very helpful as well.
- We use output schemas, don't forget to add them on the consumer side see @src/lib/schemas/README.md for more details.
- Other README files will have information about testing for specific parts of the codebase, for example @src/app/api/README.md and @src/server/routers/README.md

## Utils, Constants and Internationalization
- Use the utils module @src/lib/utils/ there you will find many utils, for example for dates on @src/lib/utils/formatting.ts
- For constants use @src/lib/constants/README.md
- All of our translations should go in the appropriate file within @src/lib/i18n/ (e.g., globals.ts, statuses.ts, layout.ts, wizard.ts, or the pages/ subdirectory).

# Project Architecture
- Always use a service, never call save directly to a model
- When doing complex operations with multuple services use the mediator pattern

## Domain layer (hexagonal) — the source of truth for entity shapes
- Canonical Zod schemas live in @src/lib/domain/ — one folder per entity (schema.ts + select.ts + adapters/{db,api,form}.ts + drift tests). Read @src/lib/domain/README.md before touching any entity shape.
- NEVER author new entity shapes in src/lib/schemas/ — the per-actor folders there are @deprecated re-export shims; only router output schemas (<domain>/output.ts) belong in schemas/.
- Every derived shape (service writes, router outputs, RHF defaults, tab-field lists) must derive from the canonical schema via .pick/.omit/.keyof/z.infer — no hand-written parallel representations.
- Actor writes go through the domain toDb() adapters (normalize → validate → transform); never hand-build actor Prisma payloads.
- Every landlord is first-class: iterate ALL landlords for links, gates, and notifications — never special-case a "primary" landlord or rely on array position.

## TRPC
- We use TRPC for our API, you can find the routers in @src/server/routers/

## Releases
- Merging release/X.Y.Z → main auto-deploys production; migrations are run manually AFTER the deploy — follow @docs/RELEASE_RUNBOOK.md.
