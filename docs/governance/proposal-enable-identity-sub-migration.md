# Proposal — Authorize the `identity_sub` Migration Against Production

Status: **ACCEPTED (Scoped model) — 2026-09-27**. `.anclora/PRODUCTION_RUNTIME.md`
now reads `PRODUCTION_MIGRATIONS_ALLOWED=true`, limited to
`0003_add_identity_sub` only. `MIGRATION_CONFIRMATION_REQUIRED=true` remains
unchanged, as this proposal recommended. See the "Scoped migration
authorization (active)" section and the migration authorization log table in
that file for the authoritative, current record. This proposal document is
kept as the historical rationale for that change, not re-edited to match —
the contract file, not this proposal, is the source of truth going forward.

**This acceptance does not itself authorize running the migration.** Applying
`0003_add_identity_sub` still requires satisfying
`MIGRATION_CONFIRMATION_REQUIRED=true` for this specific execution, following
`docs/deployment/migration-identity-sub-runbook.md`, and remains entirely
separate from `ANCLORA_IDENTITY_ENABLED` (still `false`) and from any
deployment action.

## What is being requested

A one-time, explicit authorization to run
`backend/alembic/versions/0003_add_identity_sub.py`
(`alembic upgrade head`) against the production Neon database
(`anclora-clearsheet-db`, resource id `store_AyigyfkTetw3n9wA`), following
the procedure in `docs/deployment/migration-identity-sub-runbook.md`.

## Proposed contract change (if approved)

In `.anclora/PRODUCTION_RUNTIME.md`, under "Database and migrations":

```diff
- PRODUCTION_MIGRATIONS_ALLOWED=false
+ PRODUCTION_MIGRATIONS_ALLOWED=true
```

`MIGRATION_CONFIRMATION_REQUIRED=true` is proposed to remain **unchanged** —
this repository's contract already correctly requires a per-run confirmation
in addition to the blanket allow flag, and that per-migration discipline
should stay in place regardless of whether the blanket flag becomes scoped or
standing (see the two options below).

Two implementation choices for Toni to pick between, not decided here:

1. **Scoped**: flip `PRODUCTION_MIGRATIONS_ALLOWED` to `true` only for the
   duration of this specific migration, then flip it back to `false`
   immediately after.
2. **Standing**: flip it to `true` permanently, relying entirely on
   `MIGRATION_CONFIRMATION_REQUIRED=true` (already present) as the ongoing
   per-run gate rather than toggling the blanket flag every time.

This proposal does not recommend one over the other.

## Why this is being proposed now rather than assumed

- This repository's own contract already models the two-gate pattern
  (`PRODUCTION_MIGRATIONS_ALLOWED` + `MIGRATION_CONFIRMATION_REQUIRED`)
  correctly and explicitly — CleanSheet's contract needed no correction here,
  unlike PurgeDoc's stale "no auth exists" line.
- `0001_initial_schema.py`'s own docstring states this database "was
  provisioned empty and was initialized once by the pre-Alembic bootstrap"
  and that the migration is "deliberately forward-only" — consistent with a
  cautious, one-directional migration posture that this proposal continues
  rather than overrides.

## What is NOT being proposed

- No change to `MIGRATION_SYSTEM=Alembic`.
- No change to `MIGRATION_CONFIRMATION_REQUIRED` itself (see above — it
  should stay `true`).
- No change to `DATABASE_RUNTIME_SCOPE=production` or any other declaration
  in this file unrelated to migration authorization.

## Decision needed from Toni

- Approve or reject running this migration at all.
- If approved: Scoped or Standing authorization model for
  `PRODUCTION_MIGRATIONS_ALLOWED` (see above).
- Provide the explicit per-run confirmation `MIGRATION_CONFIRMATION_REQUIRED`
  already calls for.
- Confirm the specific runbook (`docs/deployment/migration-identity-sub-runbook.md`)
  is the procedure to follow.
