# CleanSheet QA access

- QA identity: `qa.cleansheet@anclora.local`
- Frontend: `https://cleansheet.anclora.com`
- Backend: `https://api.cleansheet.anclora.com`
- Auth mechanism: closed-access email/password login with HttpOnly JWT cookies
- Secret source: encrypted AOS environment store; never commit or print it
- QA lifecycle: persistent dedicated user; `QA_DELETE_AFTER_TEST=false`

## Smoke procedure

Run `backend/.venv/bin/python scripts/qa/login-smoke.py`. It reads the QA
password from the governed local materialization, verifies login and
`/api/auth/me`, then logs out. Use synthetic CSV/XLSX fixtures only.

Do not use Toni's account, admin accounts, `qa2`, personal data, or local QA
bypass endpoints. Never include passwords, cookies, tokens, hashes, or database
URLs in logs, reports, commits, or screenshots.
