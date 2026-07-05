# Release Runbook

How a release ships. **Merging the release PR IS a production deploy** — Vercel
auto-builds `main` on merge, and nothing anywhere runs migrations automatically
(no `buildCommand` in vercel.json; CLAUDE.md forbids auto-migrations). The human
runs the prod migration, in the right order.

## Flow

```
feature/* ──PR──▶ release/X.Y.Z ──PR──▶ main ──auto──▶ Vercel production
                                              └─manual─▶ prisma migrate deploy (YOU)
```

- Feature PRs target the **active release branch** (`release/X.Y.Z`), never `main`.
- The release PR (`release/X.Y.Z → main`) is the production gate. Full e2e runs on
  PRs into main (#161); Tests run everywhere.
- After shipping, cut `release/X.Y+1.0` from the merged tip for the next arc.

## Ship checklist

### 0. Pre-flight (before merging)

1. **Migration delta**: `git log main..release/X.Y.Z -- prisma/migrations/` — list
   every migration prod hasn't seen.
2. For each pending migration, on the **prod** DB (read-only):
   - already applied? `SELECT migration_name, finished_at FROM _prisma_migrations WHERE migration_name LIKE '%<name>%';`
   - will it destroy/rewrite data? Read the SQL. Count affected rows first
     (the 2.13.0 GuaranteeMethod enum migration had an UPDATE…SET NULL clause —
     we counted 0 stray rows before shipping).
3. **Deploy-order analysis**: does the migration change column types/enums?
   - Old code + new schema breaks → migrate **after** deploy (the common case).
   - New code + old schema breaks → you need an expand/contract split; don't ship
     a single breaking migration.
4. CI green on the release tip; smoke evidence for risky slices recorded.

### 1. Merge

```bash
gh pr ready <pr>          # release PRs are often parked as drafts — this is the gate
gh pr merge <pr> --merge  # merge commit, matching release history
```

### 2. Watch the deploy

Vercel builds production from `main` (~2–5 min). Confirm the deployment is live
(Vercel dashboard, or GitHub Deployments API). Have the prod `DATABASE_URL` ready
**before** merging so the degraded window stays short.

### 3. Migrate (YOU, manually)

```bash
DATABASE_URL="<prod-url>" bunx prisma migrate deploy
```

Applies only the pending migrations recorded in `prisma/migrations/`.

### 4. Verify

- Re-run the pre-flight queries — types/values as expected.
- Smoke the flows the release touched (actor saves, portals, uploads, payments).
- Vercel function logs: no Postgres errors (`22P02` = enum/type mismatch — the
  deploy-order trap fired).

### 5. Record

```bash
git fetch origin && git tag X.Y.Z origin/main && git push origin X.Y.Z
```

Tag every release (the tag lapse from 2.12.4–2.12.5 made archaeology painful).
Close the slice issues the release delivered — **"Closes #N" in PR bodies does
NOT fire on release-branch merges** (only default-branch merges); close manually
with an evidence comment. Cut the next `release/X.Y+1.0`.

## Rollback

- **Before the migration ran**: Vercel instant-rollback to the previous
  deployment. Done.
- **After the migration ran**: rolling back code alone may recreate the
  type-mismatch trap in reverse. Revert the schema change too (write the
  down-SQL as part of pre-flight for any type-changing migration), and delete
  its `_prisma_migrations` row.

## Worked example

The 2.13.0 ship (2026-07-05) is the reference: single enum migration
(GuaranteeMethod TEXT→enum), Case-A pre-flight (unapplied, 0 stray rows,
lowercase values as expected), merge → deploy live in ~90s → migrate → verify →
tag `2.13.0` + backfill `2.12.5`. Archived detail: session log
`2026-05-28-1300` + PR #155.

## Environments

- **Production**: Vercel project on `netoho/hestia-app` `main` (hestia-dun.vercel.app).
- **Staging**: a **separate repo** (`netoho/hestia-app-staging`, its own `main` →
  hestia-app-staging.vercel.app). It does not track this repo automatically —
  push the branch there and merge via its own PR; its DB needs the migration run
  separately. Refresh it before using it as a smoke target (it goes stale).
