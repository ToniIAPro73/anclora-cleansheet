"""/api/health: DB check is opt-in (?deep=1) so Neon can scale to zero. No real DB is used."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError

from routes import health as health_module
from server import app

client = TestClient(app)


def _fail_if_called():
    raise AssertionError("database must not be queried in light mode")


def test_light_mode_does_not_touch_database(monkeypatch):
    monkeypatch.setattr(health_module, "check_database", _fail_if_called)
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "healthy", "service": "Anclora CleanSheet API", "database": "skipped"}


def test_deep_mode_checks_database(monkeypatch):
    calls = []
    monkeypatch.setattr(health_module, "check_database", lambda: calls.append(1))
    r = client.get("/api/health?deep=1")
    assert r.status_code == 200
    assert r.json()["database"] == "ok"
    assert calls == [1]


def test_deep_mode_returns_503_when_database_fails(monkeypatch):
    def boom():
        raise SQLAlchemyError("down")

    monkeypatch.setattr(health_module, "check_database", boom)
    assert client.get("/api/health?deep=true").status_code == 503
    assert client.get("/api/health").status_code == 200
