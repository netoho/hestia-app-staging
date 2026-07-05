## What

<!-- One paragraph: what changes and why. -->

## Issue

Closes #

## Smoke test steps / HITL

<!-- Concrete steps a human runs to verify this works in the real app.
     Delete the section only for pure doc/chore changes with no runtime surface. -->

1.

## Checklist

- [ ] Updated affected docs (READMEs / docs/) — or none affected
- [ ] No new `any` or hand-written schema duplication (canonical shapes derive from `src/lib/domain/<entity>/schema.ts`) — or justified below
- [ ] Output schemas (`src/lib/schemas/<domain>/output.ts`) updated for any procedure shape change
- [ ] `bun run typecheck:ratchet` passes (tsc error count did not grow)
