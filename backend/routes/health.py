from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import SQLAlchemyError

from models import check_database

router = APIRouter(tags=["health"])

@router.get("/status")
def status_check():
    return {
        "status": "healthy",
        "service": "Anclora CleanSheet API",
        "time": datetime.now(timezone.utc).isoformat(),
        "database": "PostgreSQL / SQLAlchemy (Alembic ready)"
    }

@router.get("/health")
def health_check(deep: bool = False):
    # Light by default: does not touch the database so Neon can scale to zero.
    # ?deep=1 (or deep=true) verifies the DB connection and returns 503 if it fails.
    database = "skipped"
    if deep:
        try:
            check_database()
        except SQLAlchemyError:
            raise HTTPException(status_code=503, detail="Database unavailable")
        database = "ok"
    return {
        "status": "healthy",
        "service": "Anclora CleanSheet API",
        "database": database,
    }
