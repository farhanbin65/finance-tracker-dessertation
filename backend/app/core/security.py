"""
FinSight — Security Utilities
Handles password hashing, JWT creation, verification, and role-based access control.
"""

import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from functools import wraps
from flask import request, jsonify, g
from app.core.config import config


# ── Password Hashing ──────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Hash using bcrypt 12 rounds — ~250ms, brute-force resistant."""
    salt = bcrypt.gensalt(rounds=config.BCRYPT_ROUNDS)
    hashed = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Constant-time bcrypt comparison — prevents timing attacks."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


# ── JWT Tokens ────────────────────────────────────────────────────

def create_access_token(user_id: str, email: str, role: str = "user") -> str:
    """
    Short-lived access token (1 hour).
    Includes role in payload so frontend can check admin status
    without an extra API call.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "sub":   user_id,
        "email": email,
        "role":  role,        # ← role included in JWT
        "iat":   now,
        "exp":   now + timedelta(hours=config.JWT_ACCESS_EXPIRY_HOURS),
        "type":  "access"
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Long-lived refresh token (7 days). Minimal payload."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub":  user_id,
        "iat":  now,
        "exp":  now + timedelta(days=config.JWT_REFRESH_EXPIRY_DAYS),
        "type": "refresh"
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """Decode and validate JWT. Returns payload or None."""
    try:
        return jwt.decode(
            token,
            config.JWT_SECRET,
            algorithms=[config.JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ── Auth Decorators ───────────────────────────────────────────────

def require_auth(f):
    """
    Protects any route requiring authentication.
    Injects g.current_user_id, g.current_user_email, g.current_user_role.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ")[1]
        payload = decode_token(token)

        if not payload:
            return jsonify({"error": "Token expired or invalid. Please login again."}), 401

        if payload.get("type") != "access":
            return jsonify({"error": "Invalid token type"}), 401

        # Inject user context into Flask g
        g.current_user_id    = payload["sub"]
        g.current_user_email = payload.get("email", "")
        g.current_user_role  = payload.get("role", "user")

        return f(*args, **kwargs)
    return decorated


def require_admin(f):
    """
    Admin-only route decorator.
    User must be authenticated AND have role='admin' in their JWT.

    Security principle: Principle of Least Privilege — admin routes
    are completely separate and require explicit role assignment in DB.
    Returns 403 Forbidden (not 404) so the client knows the route exists
    but access is denied — standard RBAC behaviour.

    Dissertation value: demonstrates RBAC implementation aligned
    with OWASP A01:2021 Broken Access Control mitigation.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401

        token = auth_header.split(" ")[1]
        payload = decode_token(token)

        if not payload or payload.get("type") != "access":
            return jsonify({"error": "Token expired or invalid."}), 401

        # Check role in JWT payload
        role = payload.get("role", "user")
        if role != "admin":
            return jsonify({"error": "Access denied. Admin privileges required."}), 403

        # Inject user context
        g.current_user_id    = payload["sub"]
        g.current_user_email = payload.get("email", "")
        g.current_user_role  = role

        return f(*args, **kwargs)
    return decorated