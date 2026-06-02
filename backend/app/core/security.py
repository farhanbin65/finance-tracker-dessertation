"""
FinSight — Security Utilities
Handles password hashing, JWT creation and verification.
Hybrid auth supports both custom JWT and Auth0 tokens.
"""

import bcrypt
import jwt
import requests as http_requests
from datetime import datetime, timedelta, timezone
from typing import Optional
from functools import wraps
from flask import request, jsonify, g
from app.core.config import config


# ── Password Hashing ──────────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Hash password using bcrypt with 12 rounds — ~250ms, brute-force resistant."""
    salt = bcrypt.gensalt(rounds=config.BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Constant-time bcrypt comparison — prevents timing attacks."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


# ── Custom JWT ────────────────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str) -> str:
    """Short-lived access token (1 hour). Contains user_id, email, type."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=config.JWT_ACCESS_EXPIRY_HOURS),
        "type": "access"
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Long-lived refresh token (7 days). Minimal payload for security."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(days=config.JWT_REFRESH_EXPIRY_DAYS),
        "type": "refresh"
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """
    Decode and validate a custom JWT token.
    Returns payload dict or None if invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            config.JWT_SECRET,
            algorithms=[config.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ── Auth0 Token Verification ──────────────────────────────────────────────────

# Cache Auth0 JWKS so we don't fetch on every request
_auth0_jwks_cache = None

def _get_auth0_public_key(token: str):
    """
    Fetch Auth0's public signing key from their JWKS endpoint.
    Used to verify tokens issued by Auth0 (Google/GitHub OAuth).
    Caches the key set to avoid repeated HTTP calls.
    """
    global _auth0_jwks_cache

    try:
        # Get the key ID from the token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            return None

        # Fetch JWKS if not cached
        if _auth0_jwks_cache is None:
            domain = config.AUTH0_DOMAIN  # e.g. dev-gomvag3j4o0jyjxx.us.auth0.com
            jwks_url = f"https://{domain}/.well-known/jwks.json"
            response = http_requests.get(jwks_url, timeout=5)
            _auth0_jwks_cache = response.json()

        # Find the matching key
        for key_data in _auth0_jwks_cache.get("keys", []):
            if key_data.get("kid") == kid:
                return jwt.algorithms.RSAAlgorithm.from_jwk(key_data)

        return None

    except Exception:
        return None


def decode_auth0_token(token: str) -> Optional[dict]:
    """
    Verify and decode an Auth0-issued token using their public RSA key.
    Returns payload dict with 'sub' (Auth0 user ID) or None if invalid.
    """
    try:
        public_key = _get_auth0_public_key(token)
        if not public_key:
            return None

        domain = config.AUTH0_DOMAIN
        audience = config.AUTH0_CLIENT_ID

        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=audience,
            issuer=f"https://{domain}/"
        )
        return payload

    except Exception:
        return None


# ── Hybrid Auth Decorator ─────────────────────────────────────────────────────

def require_auth(f):
    """
    Hybrid auth decorator — accepts BOTH custom JWT and Auth0 tokens.

    Flow:
    1. Try decode as custom JWT first (email/password login)
    2. If that fails, try decode as Auth0 token (Google/GitHub login)
    3. If both fail → 401

    Injects g.current_user_id and g.current_user_email into every route.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ")[1]

        # ── Try custom JWT first ──
        payload = decode_token(token)

        if payload and payload.get("type") == "access":
            # Valid custom JWT — standard flow
            g.current_user_id = payload["sub"]
            g.current_user_email = payload.get("email", "")
            return f(*args, **kwargs)

        # ── Try Auth0 token ──
        auth0_payload = decode_auth0_token(token)

        if auth0_payload:
            # Valid Auth0 token — extract user info
            # Auth0 'sub' looks like 'google-oauth2|1234567890'
            auth0_sub = auth0_payload.get("sub", "")
            email = auth0_payload.get("email", "")

            # Find or create user in MongoDB by email
            from app.db.mongo import db
            user = db.users.find_one({"email": email})

            if not user and email:
                # Auto-create user for first-time OAuth login
                from datetime import datetime, timezone
                from bson import ObjectId
                new_user = {
                    "_id": ObjectId(),
                    "full_name": auth0_payload.get("name", email.split("@")[0]),
                    "email": email,
                    "password_hash": "",   # No password for OAuth users
                    "currency": "GBP",
                    "auth0_sub": auth0_sub,
                    "created_at": datetime.now(timezone.utc)
                }
                db.users.insert_one(new_user)
                user = new_user

            if user:
                g.current_user_id = str(user["_id"])
                g.current_user_email = email
                return f(*args, **kwargs)

        # ── Both failed ──
        return jsonify({"error": "Token expired or invalid. Please login again."}), 401

    return decorated