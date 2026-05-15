"""
FinSight — Security Utilities
Handles password hashing, JWT creation and verification.
All token logic lives here — never scattered across the app.
"""

import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from app.core.config import config


# ── Password Hashing ──────────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """
    Hash a password using bcrypt with 12 rounds.
    12 rounds = ~250ms per hash — intentionally slow to resist brute force.
    """
    salt = bcrypt.gensalt(rounds=config.BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Safely compare a plain password against a stored bcrypt hash.
    Uses constant-time comparison to prevent timing attacks.
    """
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


# ── JWT Tokens ────────────────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str) -> str:
    """
    Create a short-lived JWT access token (1 hour default).
    Contains: user_id, email, issued_at, expiry, token type.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,           # Subject (user ID)
        "email": email,
        "iat": now,                # Issued at
        "exp": now + timedelta(hours=config.JWT_ACCESS_EXPIRY_HOURS),
        "type": "access"
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """
    Create a long-lived JWT refresh token (7 days default).
    Only contains user_id — minimal payload for security.
    """
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
    Decode and validate a JWT token.
    Returns the payload dict or None if invalid/expired.
    """
    try:
        payload = jwt.decode(
            token,
            config.JWT_SECRET,
            algorithms=[config.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None  # Token expired
    except jwt.InvalidTokenError:
        return None  # Token tampered or malformed


# ── Auth Decorator ────────────────────────────────────────────────────────────

from functools import wraps
from flask import request, jsonify

def require_auth(f):
    """
    Decorator to protect any route requiring authentication.
    Usage: @require_auth above any Flask route function.
    Injects `current_user_id` into the route via Flask's g object.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        # Expect: "Bearer <token>"
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ")[1]
        payload = decode_token(token)

        if not payload:
            return jsonify({"error": "Token expired or invalid. Please login again."}), 401

        if payload.get("type") != "access":
            return jsonify({"error": "Invalid token type"}), 401

        # Make user ID available to the route
        from flask import g
        g.current_user_id = payload["sub"]
        g.current_user_email = payload.get("email")

        return f(*args, **kwargs)
    return decorated