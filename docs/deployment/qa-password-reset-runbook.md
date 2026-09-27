# Runbook — Reset the CleanSheet QA Account Password

## Execution log

| Date | Email | Operator | Result |
| --- | --- | --- | --- |
| 2026-09-27 | `qa.cleansheet@anclora.local` | Toni | Applied and fully verified: `qa_password_reset_cli` audit event recorded (02:19:42 UTC), followed by a real successful manual login at `https://cleansheet.anclora.com/login` (`login_succeeded` at 02:20:28 UTC) and logout (02:20:50 UTC). Account, whitelist, `identity_sub`, and the unrelated `qa.cleansheet.phase2@anclora.local` account all verified unchanged apart from the intended password. |

Procedure for `backend/scripts/reset_qa_password.py`. This tool resets the
password of exactly one contract-authorized QA identity
(`qa.cleansheet@anclora.local` by default, via `QA_RESET_ALLOWED_EMAILS`) — it
is not a general password-reset mechanism and refuses every other account.

## Preconditions

- [ ] The QA account (`qa.cleansheet@anclora.local` or another explicitly
      allowlisted QA identity) already exists and is `active` — this tool
      does not create or reactivate accounts.
- [ ] You have direct access to the production `DATABASE_URL` (same
      connection the app itself uses — see
      `docs/deployment/migration-identity-sub-runbook.md` section 2 for how
      to confirm you have the right one).
- [ ] You have chosen a new password (≥ `AUTH_PASSWORD_MIN_LENGTH`,
      default 12 characters) and can enter it interactively — it is never
      passed as a command-line argument.
- [ ] You know your own operator identifier (e.g. your name or handle) to
      record in the audit trail — this is not a secret.

## Exact command

Run from `backend/`, with `DATABASE_URL` set in your environment (the same
way you would run any other script against production — see the migration
runbooks in this same directory for how that variable is sourced without
ever being echoed):

```bash
cd backend
python scripts/reset_qa_password.py \
  --email qa.cleansheet@anclora.local \
  --operator "<your identifier>" \
  --env production \
  --confirm-qa-reset
```

The command will:
1. Validate environment, operator, confirmation flag, and allowlist
   membership — all before asking for anything secret.
2. Print a pre-write summary (email, environment, operator, action, and a
   warning that the password will not be shown) — **never** the
   `DATABASE_URL`, an existing hash, or any secret.
3. Prompt twice, hidden (`getpass`), for the new password.
4. Reject and exit without writing anything if the two entries don't match.
5. Perform one transaction: update `users.password_hash`, insert one
   `qa_password_reset_cli` audit row, commit both together.

## How to verify the result (read-only, no secrets)

```bash
python -c "
from models import SessionLocal, User, AuthAuditEvent
db = SessionLocal()
u = db.query(User).filter(User.email == 'qa.cleansheet@anclora.local').first()
print('status:', u.status, '| updated_at:', u.updated_at)
ev = db.query(AuthAuditEvent).filter(
    AuthAuditEvent.email == 'qa.cleansheet@anclora.local',
    AuthAuditEvent.event == 'qa_password_reset_cli'
).order_by(AuthAuditEvent.created_at.desc()).first()
print('last reset event:', ev.created_at, ev.metadata_json)
db.close()
"
```

Then confirm the new password actually works:

```bash
curl -i -X POST https://api.cleansheet.anclora.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"qa.cleansheet@anclora.local","password":"<your new password>"}'
```

Expected: `200 OK` with fresh `access_token`/`refresh_token` cookies.

## How to audit the operation

Query `auth_audit_events` for `event = 'qa_password_reset_cli'` — each row
records `email`, `user_id`, `created_at`, and `metadata_json = {"operator": "..."}`.
No password, hash, or token is ever present in this table for this event
type.

## How to change the password again later

Simply run the same command again with a new password — the tool has no
concept of "already reset once"; it always overwrites the current hash for
the allowlisted account, subject to the same checks every time.

## Important limitation: existing sessions are not revoked

CleanSheet's authentication is stateless JWT with no server-side session
store — this reset **cannot** invalidate an access token (up to 1h) or
refresh token (up to 7d) issued before the reset. If you suspect the old
password was compromised (not just forgotten), be aware any token minted
under it remains valid until natural expiry. For this QA account specifically
(no real user data, no elevated privileges), this is an accepted risk, not a
defect in this tool.

## What this tool will refuse, and why

| Rejection | Reason |
|---|---|
| Email not in `QA_RESET_ALLOWED_EMAILS` | This is not a general reset tool |
| Email in `AUTH_ADMIN_EMAILS` | Never touches administrative accounts |
| No matching `users` row | Does not create accounts |
| `users.status != 'active'` | Does not reactivate suspended/disabled accounts |
| Password shorter than `AUTH_PASSWORD_MIN_LENGTH` | Same policy the app itself enforces at activation |
| Missing `--confirm-qa-reset` | Refuses to write without explicit confirmation |
| `--env` other than `production` | Refuses to run against any environment but the real one |
| Blank `--operator` | Every reset must be attributable |
