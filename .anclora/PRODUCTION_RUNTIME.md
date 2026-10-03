# Anclora CleanSheet — Production Runtime Contract

PRODUCTION_RUNTIME_MANIFEST_VERSION=2.0
STATUS=PRODUCTION_BACKED

## Deployment infrastructure

VERCEL_PROJECT_NAME=anclora-clearsheet
VERCEL_PROJECT_ID=prj_ZMw3lbQoxDjeeNwsisQ3jWDNgtsu
VERCEL_ROOT_DIRECTORY=frontend
VERCEL_FRAMEWORK=create-react-app
VERCEL_PRODUCTION_BRANCH=main
GITHUB_DEFAULT_BRANCH=development
PRODUCTION_DOMAIN=clearsheet.anclora.com
DNS_PROVIDER=Hostinger
DNS_STATUS=CONFIGURED_TLS_PENDING
BACKEND_RUNTIME_EXTERNAL_REQUIRED=true
BACKEND_RUNTIME_PROVIDER=Contabo VPS
BACKEND_RUNTIME_CONTAINERIZED=true
BACKEND_REVERSE_PROXY=Caddy
BACKEND_DEPLOY_SOURCE=main
BACKEND_DEPLOY_MODEL=Docker image pinned by SHA
BACKEND_PRODUCTION_URL=https://api.cleansheet.anclora.com
SCHEDULER_RUNTIME=SEPARATE_CONTAINER
SCHEDULER_REPLICAS=1
NEON_RESOURCE_NAME=anclora-clearsheet-db
NEON_RESOURCE_ID=store_AyigyfkTetw3n9wA
DATABASE_PROVIDER=Neon PostgreSQL
DATABASE_RUNTIME_SCOPE=production
LOCAL_RUNTIME_MODEL=PRODUCTION_BACKED

The Vercel project is frontend-only (`frontend/`). The FastAPI backend remains an
external runtime and must be exposed through `REACT_APP_BACKEND_URL` before a
production deployment is considered functional. Human local development and QA
use the same Production Neon database. SQLite remains available only for
deterministic isolated tests where already configured. DNS remains authoritative
at Hostinger.

## Runtime topology

```text
React CRA/CRACO frontend -> FastAPI backend -> SQLAlchemy -> DATABASE_URL (PostgreSQL in hosted runtime)
                                                     -> SQLite fallback when DATABASE_URL is unset
                                      -> Vercel Blob or local temporary storage
                                      -> optional Redis-backed rate limiting
                                      -> optional S3-compatible connectors
```

`LOCAL_RUNTIME_MODEL=PRODUCTION_BACKED`: human local development and QA provide
`DATABASE_URL` pointing to the Production Neon database. The current code still
has a SQLite fallback when the variable is absent; that fallback is reserved for
isolated deterministic tests and is not the human development runtime.

## Database and migrations

DATABASE_PROVIDER=Neon PostgreSQL
ORM=SQLAlchemy 2.x
MIGRATION_SYSTEM=Alembic
PRODUCTION_MIGRATIONS_ALLOWED=true
MIGRATION_CONFIRMATION_REQUIRED=true

`backend/models.py` permits `create_all` only for SQLite isolated tests. PostgreSQL
startup rejects implicit schema creation; production schema is managed by Alembic
revision `0001_initial_schema`.

### Scoped migration authorization (active)

`PRODUCTION_MIGRATIONS_ALLOWED` was flipped from `false` to `true` as a
**scoped exception**, not a blanket standing permission. It authorizes
exactly one thing:

```text
MIGRATION_AUTHORIZATION_SCOPE=identity_sub_only
MIGRATION_AUTHORIZED_REVISIONS=0003_add_identity_sub
MIGRATION_AUTHORIZATION_REASON=Additive, nullable, unique users.identity_sub column required by the Anclora Identity OIDC pilot (Wave 1); see docs/identity/ANCLORA_IDENTITY_WAVE1_CONTRACT.md in anclora-identity and docs/governance/proposal-enable-identity-sub-migration.md in this repository.
MIGRATION_AUTHORIZATION_OWNER=Toni
MIGRATION_AUTHORIZATION_DATE=2026-09-27
MIGRATION_AUTHORIZATION_ROLLBACK_PROCEDURE=docs/deployment/migration-identity-sub-runbook.md, section 16 (alembic downgrade 0002_closed_access_whitelist)
MIGRATION_AUTHORIZATION_REVIEW_CONDITION=Revisit this authorization once revision 0003_add_identity_sub has been applied to production and verified per the runbook; do not treat it as covering any later revision without a new, separately dated authorization entry below.
```

This authorization explicitly does **not**:

- authorize destructive migrations (column drops, table drops, resets) of
  any kind;
- authorize a database reset of any kind;
- authorize any Alembic revision other than `0003_add_identity_sub`;
- activate `ANCLORA_IDENTITY_ENABLED` — that remains a fully separate flag,
  set independently, and must stay `false` until after this migration is
  applied and the existing login path is re-verified (see the runbook);
- authorize any automatic deployment;
- change `MIGRATION_CONFIRMATION_REQUIRED`, which stays `true` and remains
  the separate, per-run confirmation gate this repository already declared —
  `PRODUCTION_MIGRATIONS_ALLOWED=true` alone does not satisfy it.

#### Migration authorization log

| Date | Revision(s) authorized | Scope | Owner | Status |
| --- | --- | --- | --- | --- |
| 2026-09-27 | `0003_add_identity_sub` | Additive `users.identity_sub` column + unique index only | Toni | Authorized, not yet executed |

Any future migration requires its own dated row in this table before
`PRODUCTION_MIGRATIONS_ALLOWED=true` may be relied upon for it — this table,
not the bare flag value, is the source of truth for what is actually
authorized at any given time.

## Environment contract

Backend names observed in code:

`DATABASE_URL`, `FRONTEND_URL`, `JWT_SECRET`, `CLEANSHEET_MASTER_KEY`,
`BLOB_READ_WRITE_TOKEN`, `S3_BUCKET`, `REDIS_URL`,
`AUTH_ADMIN_EMAILS`, `AUTH_WHITELIST_TOKEN_TTL_HOURS`, `AUTH_PASSWORD_MIN_LENGTH`.

Frontend names observed in code:

`REACT_APP_BACKEND_URL`, `ENABLE_HEALTH_CHECK`.

The exact names and safe placeholders are maintained in `backend/.env.example`
and `frontend/.env.example`. Secrets belong only in deployment configuration or
local ignored files. Never print their values.

## QA and operations

QA_POLICY=WORKSPACE_PROPORTIONAL
QA_MODE_DEFAULT=AUTO
FAST_TARGETED_TESTING_POLICY=MINIMUM_SUFFICIENT_SET
FAST_FULL_TEST_SUITE_ALLOWED=false
STOP_WHEN_SUFFICIENT_EVIDENCE=true
TEST_EXECUTION_POLICY=BATCHED
FULL_GATES_AFTER_EVERY_EDIT=false
REPEAT_UNCHANGED_SUCCESSFUL_GATES=false
VISUAL_QA_EXECUTION=BY_QA_MODE

TOKEN_ECONOMY_POLICY=ADAPTIVE
CAVEMAN_MODE_DEFAULT=AUTO
CAVEMAN_GRANULARITY=TASK
QA_MINIMUM_FOR_DATABASE_MIGRATION=FULL
QA_MINIMUM_FOR_AUTH=FULL
QA_MINIMUM_FOR_RELEASE_PROMOTION=FULL
GIT_WORKFLOW_MODEL=FULL_PROMOTION
WORK_BRANCH=development
AUTO_PROMOTE=false
EXPLICIT_PROMOTION_ALLOWED=true
PROMOTION_AUTHORIZATION_SCOPE=CURRENT_TASK_OR_CONVERSATION
PROMOTION_ORDER=development->staging->production->main
PROMOTION_REQUIRES_PRE_STEP_GATES=true
PROMOTION_STOP_ON_GATE_FAILURE=true
PROMOTION_FORCE_PUSH_ALLOWED=false
PROMOTION_OLD_AUTHORIZATION_PERSISTS=false


QA_AUTH_MODEL=DEDICATED_USER
QA_USER_EMAIL=qa.cleansheet@anclora.local
QA_PERSISTENT_IDENTITY=qa.cleansheet@anclora.local
QA_REUSE=true
QA_DELETE_AFTER_TEST=false
QA_CREATE_IF_MISSING=true
QA_CREATION_CONFIRMATION_REQUIRED=true
VISUAL_QA_EXECUTION=BY_QA_MODE

### QA password recovery

This codebase has no self-service or admin-endpoint password reset for any
account. Since `qa.cleansheet@anclora.local` is permanent
(`QA_DELETE_AFTER_TEST=false`) and cannot be re-provisioned through the
whitelist flow while it still exists (`POST /api/auth/activate` rejects any
email with an existing `users` row, regardless of status — see
`backend/routes/auth.py`), a dedicated administrative CLI exists for this one
purpose only:

```text
QA_PASSWORD_RESET_TOOL=backend/scripts/reset_qa_password.py
QA_PASSWORD_RESET_ALLOWLIST_ENV=QA_RESET_ALLOWED_EMAILS (defaults to qa.cleansheet@anclora.local)
```

See `docs/deployment/qa-password-reset-runbook.md` for the full procedure.
This tool never resets any account outside the QA allowlist above, and never
resets an administrative account (`AUTH_ADMIN_EMAILS`) even if misconfigured
into that allowlist.

This bootstrap contains no production migration, data mutation, deployment, or
personal-account test activity.
