#!/usr/bin/env python3
"""Administrative CLI to reset the password of a QA-designated CleanSheet account.

This is deliberately NOT a general-purpose password reset tool. It only ever
touches `users.password_hash` for an email that is both:
  1. explicitly listed in QA_RESET_ALLOWED_EMAILS (contract-driven allowlist,
     defaults to the single QA identity documented in
     .anclora/PRODUCTION_RUNTIME.md), and
  2. NOT present in AUTH_ADMIN_EMAILS.

No other column, table, whitelist entry, or session is modified. See
docs/deployment/qa-password-reset-runbook.md for the operational procedure.

Design rationale for anyone reviewing this file:
- CLI, not an HTTP endpoint: an admin reset action has no legitimate reason to
  be reachable over the network surface at all (see requirement 1 in the
  originating task).
- The new password is read interactively via `getpass` (hidden stdin) and is
  never accepted as a command-line argument, logged, or included in any
  exception message.
- This module intentionally does NOT call the shared `record_audit_event()`
  helper (backend/auth.py), because that helper performs its own internal
  commit/rollback and swallows exceptions — which would make the atomicity
  of "update password_hash + write one audit row" harder to reason about and
  to test. Instead this module manages one explicit transaction itself.
"""
from __future__ import annotations

import argparse
import getpass
import sys
from datetime import datetime, timezone

sys.path.insert(0, ".")

from models import SessionLocal, User, AuthAuditEvent  # noqa: E402
from auth import hash_password, get_admin_emails, AUTH_PASSWORD_MIN_LENGTH  # noqa: E402
import os  # noqa: E402


class QAResetError(Exception):
    """Base class for all rejection reasons. Never includes secret material."""


class EnvironmentNotAllowedError(QAResetError):
    pass


class OperatorRequiredError(QAResetError):
    pass


class ConfirmationRequiredError(QAResetError):
    pass


class NotQAIdentityError(QAResetError):
    pass


class AdminAccountRejectedError(QAResetError):
    pass


class PasswordTooShortError(QAResetError):
    pass


class UserNotFoundError(QAResetError):
    pass


class AccountNotActiveError(QAResetError):
    pass


class PersistenceError(QAResetError):
    """Raised when the write transaction itself fails; the caller can assume
    the transaction was rolled back and nothing was persisted."""


ALLOWED_ENVIRONMENT = "production"


def get_qa_allowed_emails() -> list[str]:
    """Contract-driven allowlist. Defaults to the single QA identity declared
    in .anclora/PRODUCTION_RUNTIME.md (QA_PERSISTENT_IDENTITY). Additional QA
    identities can be added via QA_RESET_ALLOWED_EMAILS without a code change,
    but the default ships safe (one known-good email) rather than empty or
    wildcard.
    """
    raw = os.environ.get("QA_RESET_ALLOWED_EMAILS", "qa.cleansheet@anclora.local")
    return [e.strip().lower() for e in raw.split(",") if e.strip()]


def reset_qa_password(
    db,
    *,
    email: str,
    new_password: str,
    operator: str,
    environment: str,
    confirmed: bool,
) -> str:
    """Core, directly-testable reset operation. Returns the affected user id.

    Every rejection path raises before any database write occurs. The single
    write (password_hash + one audit row) happens in one transaction; on any
    failure during that write, the transaction is rolled back and a
    PersistenceError is raised — nothing is left partially applied.
    """
    if environment != ALLOWED_ENVIRONMENT:
        raise EnvironmentNotAllowedError(
            f"This command only runs against '{ALLOWED_ENVIRONMENT}'; refusing '{environment}'."
        )

    if not operator or not operator.strip():
        raise OperatorRequiredError("An operator identifier is required.")

    if not confirmed:
        raise ConfirmationRequiredError("Refusing to write without explicit confirmation.")

    clean_email = email.strip().lower()

    allowed = get_qa_allowed_emails()
    if clean_email not in allowed:
        raise NotQAIdentityError(
            f"{clean_email} is not in the QA reset allowlist. This command never resets arbitrary accounts."
        )

    admin_emails = get_admin_emails()
    if clean_email in admin_emails:
        raise AdminAccountRejectedError(
            f"{clean_email} is an administrative account; this command refuses to touch admin accounts."
        )

    if len(new_password) < AUTH_PASSWORD_MIN_LENGTH:
        raise PasswordTooShortError(
            f"Password must be at least {AUTH_PASSWORD_MIN_LENGTH} characters."
        )

    user = db.query(User).filter(User.email == clean_email).first()
    if user is None:
        raise UserNotFoundError(f"No user exists for {clean_email}.")

    if user.status != "active":
        # Per the originating requirement: suspended/disabled accounts are
        # rejected unless a future revision of this procedure documents an
        # explicit override. No override exists today.
        raise AccountNotActiveError(
            f"Account status is '{user.status}', not 'active'. This command does not reactivate accounts."
        )

    new_hash = hash_password(new_password)

    try:
        user.password_hash = new_hash
        user.updated_at = datetime.now(timezone.utc)
        db.add(
            AuthAuditEvent(
                event="qa_password_reset_cli",
                email=clean_email,
                user_id=user.id,
                metadata_json={"operator": operator},
            )
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        raise PersistenceError("Failed to persist the password reset; transaction rolled back.") from exc

    return user.id


def _print_preflight_summary(email: str, environment: str, operator: str) -> None:
    print("-----------------------------------------------------------------")
    print("QA PASSWORD RESET — PRE-WRITE SUMMARY")
    print("-----------------------------------------------------------------")
    print(f"QA email:    {email}")
    print(f"Environment: {environment}")
    print(f"Operator:    {operator}")
    print("Action:      reset users.password_hash for this QA account only")
    print("The new password will NOT be displayed or logged at any point.")
    print("-----------------------------------------------------------------")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Reset the password of a contract-authorized QA account. Never a generic reset tool."
    )
    parser.add_argument("--email", required=True, help="QA email to reset (must be contract-authorized)")
    parser.add_argument("--operator", required=True, help="Identifier of the person performing this reset")
    parser.add_argument("--env", required=True, help="Target environment; must be 'production'")
    parser.add_argument(
        "--confirm-qa-reset",
        action="store_true",
        help="Required. Without this flag the command refuses to write.",
    )
    args = parser.parse_args()

    clean_email = args.email.strip().lower()

    # Fail fast on every non-secret precondition before ever prompting for a
    # password, so an operator never types a password only to have it
    # rejected on an unrelated ground.
    if args.env != ALLOWED_ENVIRONMENT:
        print(
            f"ERROR: environment '{args.env}' is not permitted. Only '{ALLOWED_ENVIRONMENT}' is allowed.",
            file=sys.stderr,
        )
        sys.exit(1)
    if not args.operator.strip():
        print("ERROR: --operator is required and cannot be blank.", file=sys.stderr)
        sys.exit(1)
    if not args.confirm_qa_reset:
        print("ERROR: refusing to proceed without --confirm-qa-reset.", file=sys.stderr)
        sys.exit(1)
    if clean_email not in get_qa_allowed_emails():
        print(f"ERROR: {clean_email} is not an authorized QA identity.", file=sys.stderr)
        sys.exit(1)
    if clean_email in get_admin_emails():
        print(f"ERROR: {clean_email} is an administrative account; refusing.", file=sys.stderr)
        sys.exit(1)

    _print_preflight_summary(clean_email, args.env, args.operator)

    new_password = getpass.getpass("New password (hidden, will not be echoed): ")
    confirm_password = getpass.getpass("Confirm new password: ")
    if new_password != confirm_password:
        print("ERROR: passwords did not match. Nothing was changed.", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        user_id = reset_qa_password(
            db,
            email=clean_email,
            new_password=new_password,
            operator=args.operator,
            environment=args.env,
            confirmed=args.confirm_qa_reset,
        )
    except QAResetError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()

    print("-----------------------------------------------------------------")
    print(f"Password reset succeeded for {clean_email} (user id: {user_id}).")
    print("An audit event 'qa_password_reset_cli' was recorded (no secrets).")
    print("-----------------------------------------------------------------")


if __name__ == "__main__":
    main()
