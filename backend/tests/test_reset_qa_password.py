import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

os.environ.setdefault("AUTH_ADMIN_EMAILS", "admin@anclora.local")
os.environ.setdefault("AUTH_PASSWORD_MIN_LENGTH", "12")
os.environ.setdefault("QA_RESET_ALLOWED_EMAILS", "qa.cleansheet@anclora.local")

from models import Base, User, AuthWhitelist, AuthAuditEvent  # noqa: E402
from auth import hash_password, verify_password  # noqa: E402
from scripts.reset_qa_password import (  # noqa: E402
    reset_qa_password,
    EnvironmentNotAllowedError,
    OperatorRequiredError,
    ConfirmationRequiredError,
    NotQAIdentityError,
    AdminAccountRejectedError,
    PasswordTooShortError,
    UserNotFoundError,
    AccountNotActiveError,
    PersistenceError,
)

QA_EMAIL = "qa.cleansheet@anclora.local"
ORIGINAL_PASSWORD = "OriginalQAPassword123!"
NEW_PASSWORD = "BrandNewQAPassword456!"

# This suite must never be able to reach Neon production, even if the
# developer's shell exports a real DATABASE_URL. A dedicated in-memory
# SQLite engine — independent of models.SessionLocal/models.engine — is
# created here and used for every test in this file.
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
assert test_engine.dialect.name == "sqlite"
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
Base.metadata.create_all(bind=test_engine)


@pytest.fixture
def db_session():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def qa_user(db_session):
    existing = db_session.query(User).filter(User.email == QA_EMAIL).first()
    if existing:
        db_session.delete(existing)
        db_session.commit()
    user = User(
        id=str(uuid.uuid4()),
        email=QA_EMAIL,
        password_hash=hash_password(ORIGINAL_PASSWORD),
        display_name="CleanSheet QA",
        status="active",
    )
    db_session.add(user)
    wl = AuthWhitelist(
        id=str(uuid.uuid4()),
        email=QA_EMAIL,
        status="active",
        user_id=user.id,
        created_by="test_fixture",
        activated_at=datetime.now(timezone.utc),
    )
    db_session.add(wl)
    db_session.commit()
    db_session.refresh(user)
    yield user
    db_session.query(AuthAuditEvent).filter(AuthAuditEvent.email == QA_EMAIL).delete()
    db_session.query(AuthWhitelist).filter(AuthWhitelist.email == QA_EMAIL).delete()
    db_session.query(User).filter(User.email == QA_EMAIL).delete()
    db_session.commit()


def test_correct_reset_of_authorized_qa_account(db_session, qa_user):
    user_id = reset_qa_password(
        db_session,
        email=QA_EMAIL,
        new_password=NEW_PASSWORD,
        operator="toni",
        environment="production",
        confirmed=True,
    )
    assert user_id == qa_user.id

    fresh = TestSessionLocal()
    try:
        updated = fresh.query(User).filter(User.email == QA_EMAIL).first()
        assert verify_password(NEW_PASSWORD, updated.password_hash) is True
        assert verify_password(ORIGINAL_PASSWORD, updated.password_hash) is False
    finally:
        fresh.close()


def test_rejects_non_qa_email(db_session, qa_user):
    with pytest.raises(NotQAIdentityError):
        reset_qa_password(
            db_session,
            email="someone.else@anclora.com",
            new_password=NEW_PASSWORD,
            operator="toni",
            environment="production",
            confirmed=True,
        )


def test_rejects_nonexistent_user(db_session):
    # In the allowlist, but no users row exists for it in this test's DB state.
    os.environ["QA_RESET_ALLOWED_EMAILS"] = "qa.ghost@anclora.local"
    try:
        with pytest.raises(UserNotFoundError):
            reset_qa_password(
                db_session,
                email="qa.ghost@anclora.local",
                new_password=NEW_PASSWORD,
                operator="toni",
                environment="production",
                confirmed=True,
            )
    finally:
        os.environ["QA_RESET_ALLOWED_EMAILS"] = QA_EMAIL


def test_rejects_admin_account_even_if_qa_allowlisted(db_session, qa_user):
    os.environ["QA_RESET_ALLOWED_EMAILS"] = f"{QA_EMAIL},admin@anclora.local"
    try:
        with pytest.raises(AdminAccountRejectedError):
            reset_qa_password(
                db_session,
                email="admin@anclora.local",
                new_password=NEW_PASSWORD,
                operator="toni",
                environment="production",
                confirmed=True,
            )
    finally:
        os.environ["QA_RESET_ALLOWED_EMAILS"] = QA_EMAIL


def test_rejects_suspended_account(db_session, qa_user):
    qa_user.status = "disabled"
    db_session.commit()
    with pytest.raises(AccountNotActiveError):
        reset_qa_password(
            db_session,
            email=QA_EMAIL,
            new_password=NEW_PASSWORD,
            operator="toni",
            environment="production",
            confirmed=True,
        )


def test_rejects_without_confirmation(db_session, qa_user):
    with pytest.raises(ConfirmationRequiredError):
        reset_qa_password(
            db_session,
            email=QA_EMAIL,
            new_password=NEW_PASSWORD,
            operator="toni",
            environment="production",
            confirmed=False,
        )
    fresh = TestSessionLocal()
    try:
        unchanged = fresh.query(User).filter(User.email == QA_EMAIL).first()
        assert verify_password(ORIGINAL_PASSWORD, unchanged.password_hash) is True
    finally:
        fresh.close()


def test_rejects_without_operator(db_session, qa_user):
    with pytest.raises(OperatorRequiredError):
        reset_qa_password(
            db_session,
            email=QA_EMAIL,
            new_password=NEW_PASSWORD,
            operator="   ",
            environment="production",
            confirmed=True,
        )


def test_rejects_wrong_environment(db_session, qa_user):
    with pytest.raises(EnvironmentNotAllowedError):
        reset_qa_password(
            db_session,
            email=QA_EMAIL,
            new_password=NEW_PASSWORD,
            operator="toni",
            environment="staging",
            confirmed=True,
        )


def test_rejects_password_too_short(db_session, qa_user):
    with pytest.raises(PasswordTooShortError):
        reset_qa_password(
            db_session,
            email=QA_EMAIL,
            new_password="short",
            operator="toni",
            environment="production",
            confirmed=True,
        )


def test_hash_updated_correctly(db_session, qa_user):
    old_hash = qa_user.password_hash
    reset_qa_password(
        db_session,
        email=QA_EMAIL,
        new_password=NEW_PASSWORD,
        operator="toni",
        environment="production",
        confirmed=True,
    )
    fresh = TestSessionLocal()
    try:
        updated = fresh.query(User).filter(User.email == QA_EMAIL).first()
        assert updated.password_hash != old_hash
        assert verify_password(NEW_PASSWORD, updated.password_hash) is True
    finally:
        fresh.close()


def test_email_and_permissions_unchanged(db_session, qa_user):
    reset_qa_password(
        db_session,
        email=QA_EMAIL,
        new_password=NEW_PASSWORD,
        operator="toni",
        environment="production",
        confirmed=True,
    )
    fresh = TestSessionLocal()
    try:
        updated = fresh.query(User).filter(User.email == QA_EMAIL).first()
        assert updated.email == QA_EMAIL
        assert updated.status == "active"
        assert updated.identity_sub is None

        wl = fresh.query(AuthWhitelist).filter(AuthWhitelist.email == QA_EMAIL).first()
        assert wl.status == "active"
        assert wl.user_id == updated.id
    finally:
        fresh.close()


def test_audit_event_created_without_secrets(db_session, qa_user):
    reset_qa_password(
        db_session,
        email=QA_EMAIL,
        new_password=NEW_PASSWORD,
        operator="toni",
        environment="production",
        confirmed=True,
    )
    fresh = TestSessionLocal()
    try:
        event = (
            fresh.query(AuthAuditEvent)
            .filter(AuthAuditEvent.email == QA_EMAIL, AuthAuditEvent.event == "qa_password_reset_cli")
            .order_by(AuthAuditEvent.created_at.desc())
            .first()
        )
        assert event is not None
        assert event.metadata_json == {"operator": "toni"}
        serialized = str(event.metadata_json)
        assert NEW_PASSWORD not in serialized
        assert ORIGINAL_PASSWORD not in serialized
        assert "password" not in serialized.lower()
        assert "hash" not in serialized.lower()
    finally:
        fresh.close()


def test_rollback_on_persistence_error(db_session, qa_user, monkeypatch):
    old_hash = qa_user.password_hash

    def boom():
        raise RuntimeError("simulated commit failure")

    monkeypatch.setattr(db_session, "commit", boom)

    with pytest.raises(PersistenceError):
        reset_qa_password(
            db_session,
            email=QA_EMAIL,
            new_password=NEW_PASSWORD,
            operator="toni",
            environment="production",
            confirmed=True,
        )

    fresh = TestSessionLocal()
    try:
        unchanged = fresh.query(User).filter(User.email == QA_EMAIL).first()
        assert unchanged.password_hash == old_hash
        event = (
            fresh.query(AuthAuditEvent)
            .filter(AuthAuditEvent.email == QA_EMAIL, AuthAuditEvent.event == "qa_password_reset_cli")
            .first()
        )
        assert event is None
    finally:
        fresh.close()


def test_no_session_store_touched_existing_tokens_remain_valid_by_design(db_session, qa_user):
    """CleanSheet's auth is stateless JWT (no server-side session table for
    login sessions) — this reset cannot and does not attempt to revoke
    outstanding access/refresh tokens. This test documents that invariant:
    the reset touches only users.password_hash/updated_at and inserts one
    audit row, nothing else."""
    reset_qa_password(
        db_session,
        email=QA_EMAIL,
        new_password=NEW_PASSWORD,
        operator="toni",
        environment="production",
        confirmed=True,
    )
    fresh = TestSessionLocal()
    try:
        audit_count = (
            fresh.query(AuthAuditEvent)
            .filter(AuthAuditEvent.email == QA_EMAIL)
            .count()
        )
        assert audit_count == 1
        wl = fresh.query(AuthWhitelist).filter(AuthWhitelist.email == QA_EMAIL).first()
        assert wl.status == "active"
        assert wl.revoked_at is None
    finally:
        fresh.close()


def test_password_never_appears_in_cli_process_arguments():
    """The CLI must never accept the password as a process argument — verify
    the script's argparse surface has no such option at all."""
    result = subprocess.run(
        [sys.executable, "scripts/reset_qa_password.py", "--help"],
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        capture_output=True,
        text=True,
    )
    assert "--password" not in result.stdout
    assert "-p " not in result.stdout


def test_password_never_appears_in_stdout_or_stderr_of_core_function(db_session, qa_user, capsys):
    reset_qa_password(
        db_session,
        email=QA_EMAIL,
        new_password=NEW_PASSWORD,
        operator="toni",
        environment="production",
        confirmed=True,
    )
    captured = capsys.readouterr()
    assert NEW_PASSWORD not in captured.out
    assert NEW_PASSWORD not in captured.err
