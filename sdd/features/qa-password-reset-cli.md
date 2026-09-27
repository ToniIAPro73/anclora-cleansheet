# Feature Spec — QA Password Reset CLI

## Problem

CleanSheet has no password-reset or password-change route of any kind
(confirmed by full inspection of `routes/auth.py`). When the documented QA
identity `qa.cleansheet@anclora.local` loses its known-working password,
there was no supported way to set a new one without either building a new
capability or running direct, unaudited SQL against production.

## Goal

A narrowly-scoped administrative CLI that can reset the password of exactly
the QA identities the contract authorizes, with no path to becoming a
general-purpose account-reset tool.

## Design

- **Location**: `backend/scripts/reset_qa_password.py`, mirroring the
  existing `backend/scripts/manage_whitelist.py` operator-CLI pattern — not
  an HTTP endpoint, so it is never part of the network-reachable attack
  surface.
- **Core function** `reset_qa_password(db, *, email, new_password, operator,
  environment, confirmed)`: directly testable, raises a specific `QAResetError`
  subclass for every rejection reason, performs exactly one write
  transaction (password hash + one audit row), and rolls back cleanly on any
  failure during that write.
- **CLI wrapper** (`main()`): parses `--email`, `--operator`, `--env`,
  `--confirm-qa-reset`; validates every non-secret precondition before ever
  prompting for a password; reads the new password twice via `getpass`
  (never as a process argument, never logged).
- **Allowlist**: `QA_RESET_ALLOWED_EMAILS` env var (default:
  `qa.cleansheet@anclora.local`, matching
  `.anclora/PRODUCTION_RUNTIME.md`'s `QA_PERSISTENT_IDENTITY`). An email
  outside this list is rejected before any database query runs.
- **Admin exclusion**: any email present in `AUTH_ADMIN_EMAILS` is rejected
  even if it were mistakenly also present in the QA allowlist — defense in
  depth against this ever reaching a privileged account.
- **Environment gate**: `--env` must literally equal `production` (this
  app's only real environment for the production-backed QA identity) or the
  command refuses to run.
- **Password hashing**: reuses `auth.hash_password()` (Argon2id,
  `time_cost=2, memory_cost=19456, parallelism=1`) — no new hashing scheme
  introduced.
- **Audit**: writes one `auth_audit_events` row, `event=qa_password_reset_cli`,
  `metadata_json={"operator": <operator>}` — never the password or hash.
- **No migration required**: `users.password_hash` already exists as a
  column; this feature only ever writes to it.

## Non-goals

- Not a self-service "forgot password" flow for real end users — this
  remains explicitly unsupported for non-QA accounts, by design.
- Does not reactivate suspended/disabled accounts (rejects them instead) —
  a suspended account being unable to log in is a separate, deliberate state
  this tool does not override.
- Does not revoke existing sessions/tokens. See "Session handling" below.

## Session handling (explicitly documented per requirement)

CleanSheet's authentication is stateless JWT — there is no server-side
session table for login sessions (unlike, e.g., PurgeDoc's `session_owners`,
which tracks document-processing session ownership, not auth sessions).
Access tokens (1h TTL) and refresh tokens (7d TTL) cannot be revoked
server-side in this codebase's current design. **This means a password reset
does not and cannot invalidate any outstanding token issued before the
reset** — an attacker or stale session holding a still-valid token remains
valid until its natural expiry regardless of a password change. For a QA
account with no real user data and no elevated privileges, this is an
accepted residual risk, not a gap this feature attempts to close; closing it
would require adding a server-side session/token-revocation mechanism to the
whole application, which is out of scope here.

## Testing

16 tests added in `backend/tests/test_reset_qa_password.py`, covering every
rejection path, successful reset, hash correctness, unchanged
email/status/whitelist/`identity_sub`, secret-free audit content, rollback on
a simulated persistence failure, and confirmation that the password never
appears in process arguments, stdout, or stderr. All pass against the
existing SQLite test fallback (`models.py`'s default when `DATABASE_URL` is
unset) — no production database is touched by the test suite.
