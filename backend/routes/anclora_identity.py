"""Anclora Identity OIDC login/callback for CleanSheet.

Additional login path alongside the existing whitelist/password flow in
routes/auth.py, gated behind ANCLORA_IDENTITY_ENABLED (anclora_identity_oidc.py).
Never auto-provisions a CleanSheet account: a successful Anclora Identity
login is only accepted for an email that already has an active CleanSheet
`users` row and an active `auth_whitelist` entry — the same admission check
`POST /auth/login` performs today. This preserves CleanSheet's closed-access
invariant (docs/auth-access.md).

Authlib's `authorize_access_token()` + `parse_id_token()` perform the
Authorization Code + PKCE exchange and validate the ID token's issuer,
audience, signature (via the provider's published JWKS) and expiration; we
additionally check `nonce` explicitly and `email_verified`.
"""
import secrets
from authlib.integrations.starlette_client import OAuthError
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from models import get_db, User, AuthWhitelist
from auth import create_access_token, create_refresh_token, record_audit_event, APP_ENV
import anclora_identity_oidc as oidc

router = APIRouter(prefix="/auth/anclora-identity", tags=["auth", "anclora-identity"])

COOKIE_SECURE = (APP_ENV == "production")
COOKIE_SAMESITE = "none" if COOKIE_SECURE else "lax"


def _require_enabled():
    if not oidc.ANCLORA_IDENTITY_ENABLED:
        raise HTTPException(status_code=404)


def _set_session_cookies(response: RedirectResponse, access_token: str, refresh_token: str) -> None:
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=COOKIE_SECURE, samesite=COOKIE_SAMESITE, max_age=604800, path="/")


@router.get("/login")
async def anclora_identity_login(request: Request):
    _require_enabled()
    nonce = secrets.token_urlsafe(32)
    request.session["anclora_identity_nonce"] = nonce
    return await oidc.oauth.anclora_identity.authorize_redirect(
        request, oidc.ANCLORA_IDENTITY_REDIRECT_URI, nonce=nonce
    )


@router.get("/callback")
async def anclora_identity_callback(request: Request, db: Session = Depends(get_db)):
    _require_enabled()

    try:
        token = await oidc.oauth.anclora_identity.authorize_access_token(request)
    except OAuthError:
        raise HTTPException(status_code=400, detail="OIDC_EXCHANGE_FAILED")

    nonce = request.session.pop("anclora_identity_nonce", None)
    try:
        claims = await oidc.oauth.anclora_identity.parse_id_token(request, token, nonce=nonce)
    except Exception:
        raise HTTPException(status_code=400, detail="OIDC_ID_TOKEN_INVALID")

    email = (claims.get("email") or "").strip().lower()
    if not email or not claims.get("email_verified"):
        record_audit_event(db, "oidc_login_rejected", email=email or None, metadata={"reason": "email_not_verified"})
        raise HTTPException(status_code=403, detail="EMAIL_NOT_VERIFIED")

    identity_sub = claims.get("sub")
    if not identity_sub:
        raise HTTPException(status_code=400, detail="OIDC_ID_TOKEN_INVALID")

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        record_audit_event(db, "oidc_login_rejected", email=email, metadata={"reason": "no_local_account"})
        raise HTTPException(status_code=403, detail="ACCESS_DENIED")

    whitelist = db.query(AuthWhitelist).filter(
        (AuthWhitelist.user_id == user.id) | (AuthWhitelist.email == email)
    ).first()
    if user.status != "active" or not whitelist or whitelist.status != "active":
        record_audit_event(db, "oidc_login_rejected", email=email, user_id=user.id, metadata={"reason": "whitelist_not_active"})
        raise HTTPException(status_code=403, detail="ACCESS_DENIED")

    if user.identity_sub is None:
        user.identity_sub = identity_sub
        db.commit()
    elif user.identity_sub != identity_sub:
        record_audit_event(db, "oidc_login_rejected", email=email, user_id=user.id, metadata={"reason": "identity_subject_mismatch"})
        raise HTTPException(status_code=409, detail="IDENTITY_SUBJECT_MISMATCH")

    access_token = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)

    response = RedirectResponse(url=oidc.ANCLORA_IDENTITY_POST_LOGIN_REDIRECT)
    _set_session_cookies(response, access_token, refresh_token)
    record_audit_event(db, "login_succeeded", email=user.email, user_id=user.id, metadata={"method": "anclora_identity"})
    return response
