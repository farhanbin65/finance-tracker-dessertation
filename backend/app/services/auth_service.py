"""
FinSight — Auth Service (Business Logic Layer)
All authentication logic lives here — routes just call these functions.
This separation makes testing and maintenance much cleaner.
"""

from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from app.db.mongo import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token
from app.core.logging import logger
from app.models.user import UserRegisterRequest, UserLoginRequest
from app.core.encryption import encrypt_field, decrypt_field, hash_email_for_lookup


class AuthError(Exception):
    """Custom exception for auth failures with HTTP status codes."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def register_user(data: UserRegisterRequest) -> dict:
    """
    Register a new user.
    Steps:
    1. Check email not already registered
    2. Hash password with bcrypt
    3. Insert user document into MongoDB
    4. Log the registration event
    5. Return tokens (auto-login after register)
    """
    db = get_db()

    # Step 1: Check for duplicate email
    existing = db.users.find_one({"email_hash": hash_email_for_lookup(data.email)})
    if existing:
        raise AuthError("An account with this email already exists.", 409)

    # Step 2: Hash password
    password_hash = hash_password(data.password)

    # Step 3: Build and insert user document
    user_doc = {
        "full_name":   encrypt_field(data.full_name.strip()),
        "email":       encrypt_field(data.email.lower()),
        "email_hash":  hash_email_for_lookup(data.email),
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "is_active": True,
        "mfa_enabled": False,
        "last_login": None,
        "currency": "GBP",
        "monthly_income": None,
    }

    result = db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Step 4: Audit log
    _write_audit_log(user_id, "USER_REGISTERED", {"email": data.email})
    logger.info("User registered", extra={"user_id": user_id, "email": data.email})

    # Step 5: Return tokens (user is logged in immediately)
    return {
        "access_token": create_access_token(user_id, data.email),
        "refresh_token": create_refresh_token(user_id),
        "user": {
            "id": user_id,
            "full_name": data.full_name.strip(),
            "email": data.email.lower(),
            "currency": "GBP",
        }
    }


def login_user(data: UserLoginRequest) -> dict:
    """
    Authenticate an existing user.
    Steps:
    1. Find user by email
    2. Verify password with bcrypt
    3. Update last_login timestamp
    4. Return access + refresh tokens
    """
    db = get_db()

    # Step 1: Find user (always lowercase email)
    user = db.users.find_one({"email_hash": hash_email_for_lookup(data.email)})

    if user and user.get("is_banned"):
        raise AuthError("This account has been suspended. Contact support.", 403)

    # Step 2: Verify — same error message whether user not found or wrong password
    # (prevents user enumeration attacks)
    if not user or not verify_password(data.password, user["password_hash"]):
        raise AuthError("Invalid email or password.", 401)

    if not user.get("is_active", True):
        raise AuthError("Your account has been deactivated. Contact support.", 403)

    user_id = str(user["_id"])

    # Step 3: Update last login
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc)}}
    )

    # Step 4: Audit log
    _write_audit_log(user_id, "USER_LOGIN", {"email": data.email})
    logger.info("User logged in", extra={"user_id": user_id})

    # Get role — defaults to 'user' if not set
    role = user.get("role", "user")

    return {    
        "access_token": create_access_token(user_id, decrypt_field(user["email"]), role),
        "refresh_token": create_refresh_token(user_id),
        "user": {
            "id":        user_id,
            "full_name": decrypt_field(user["full_name"]),
            "email":     decrypt_field(user["email"]),
            "currency":  user.get("currency", "GBP"),
            "role":      role,
        }
    }


def get_current_user(user_id: str) -> dict:
    """
    Fetch the authenticated user's profile by their ID.
    Used by the /me endpoint after token verification.
    """
    db = get_db()

    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise AuthError("User not found.", 404)

    return {
        "id": str(user["_id"]),
        "full_name": decrypt_field(user["full_name"]),
        "email": user["email"],
        "currency": user.get("currency", "GBP"),
        "mfa_enabled": user.get("mfa_enabled", False),
        "created_at": user["created_at"].isoformat(),
    }


def _write_audit_log(user_id: str, action: str, metadata: dict) -> None:
    """
    Write an immutable audit log entry.
    Every significant action in FinSight is recorded here.
    This is a GDPR and fintech compliance requirement.
    """
    try:
        db = get_db()
        db.audit_logs.insert_one({
            "user_id": user_id,
            "action": action,
            "metadata": metadata,
            "timestamp": datetime.now(timezone.utc),
        })
    except Exception as e:
        # Never let audit logging failure crash the main flow
        logger.error("Audit log write failed", extra={"error": str(e)})