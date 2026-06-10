"""
FinSight — Auth Routes
Thin route layer — only handles HTTP concerns.
All business logic is in auth_service.py.
"""

from flask import Blueprint, request, jsonify
from pydantic import ValidationError

from app.services.auth_service import register_user, login_user, get_current_user, AuthError
from app.models.user import UserRegisterRequest, UserLoginRequest
from app.core.security import require_auth
from flask import g
from app.db.mongo import get_db

# Blueprint groups all auth routes under /api/auth
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    POST /api/auth/register
    Body: { full_name, email, password }
    Returns: { access_token, refresh_token, user }
    """
    try:
        # Validate and parse request body with Pydantic
        data = UserRegisterRequest(**request.get_json(silent=True) or {})
        result = register_user(data)
        return jsonify(result), 201

    except ValidationError as e:
        # Pydantic validation failed — return first error message
        errors = e.errors()
        first_error = errors[0]["msg"] if errors else "Validation error"
        return jsonify({"error": first_error}), 422

    except AuthError as e:
        return jsonify({"error": e.message}), e.status_code

    except Exception as e:
        return jsonify({"error": "Registration failed. Please try again."}), 500


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    POST /api/auth/login
    Body: { email, password }
    Returns: { access_token, refresh_token, user }
    """
    try:
        data = UserLoginRequest(**request.get_json(silent=True) or {})

        db = get_db()
        user = db.users.find_one({"email": data.email.lower()})
        if user and user.get("is_banned"):
            return jsonify({"error": "This account has been suspended. Contact support."}), 403

        result = login_user(data)
        return jsonify(result), 200

    except ValidationError as e:
        errors = e.errors()
        first_error = errors[0]["msg"] if errors else "Validation error"
        return jsonify({"error": first_error}), 422

    except AuthError as e:
        return jsonify({"error": e.message}), e.status_code

    except Exception as e:
        return jsonify({"error": "Login failed. Please try again."}), 500

@auth_bp.route("/auth0-login", methods=["POST"])
def auth0_login():
    """
    POST /api/auth/auth0-login
    Called after Auth0 social login.
    Receives Auth0 user info, creates/finds user in our DB,
    returns our own JWT tokens.
    """
    try:
        body = request.get_json(silent=True) or {}
        email = body.get("email", "").lower()
        full_name = body.get("full_name", "")
        auth0_id = body.get("auth0_id", "")

        if not email:
            return jsonify({"error": "Email is required"}), 400

        from app.db.mongo import get_db
        from app.core.security import create_access_token, create_refresh_token
        from datetime import datetime, timezone
        from app.services.auth_service import _write_audit_log

        db = get_db()

        # Find existing user or create new one
        user = db.users.find_one({"email": email})

        if user and user.get("is_banned"):
            return jsonify({"error": "This account has been suspended. Contact support."}), 403

        if not user:
            # First time Auth0 login — create account automatically
            user_doc = {
                "full_name": full_name,
                "email": email,
                "password_hash": "",        # No password for social users
                "auth0_id": auth0_id,
                "auth_provider": "auth0",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "is_active": True,
                "mfa_enabled": False,
                "last_login": datetime.now(timezone.utc),
                "currency": "GBP",
            }
            result = db.users.insert_one(user_doc)
            user_id = str(result.inserted_id)
            _write_audit_log(user_id, "AUTH0_REGISTER", {"email": email})
        else:
            user_id = str(user["_id"])
            # Update last login
            db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {
                    "last_login": datetime.now(timezone.utc),
                    "auth0_id": auth0_id,
                }}
            )
            _write_audit_log(user_id, "AUTH0_LOGIN", {"email": email})

        return jsonify({
            "access_token": create_access_token(user_id, email),
            "refresh_token": create_refresh_token(user_id),
            "user": {
                "id": user_id,
                "full_name": full_name,
                "email": email,
                "currency": "GBP",
            }
        }), 200

    except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error("Auth0 login failed", extra={"error": str(e)})
            return jsonify({"error": f"Auth0 login failed: {str(e)}"}), 500
@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    """
    GET /api/auth/me
    Header: Authorization: Bearer <access_token>
    Returns: current user's profile (no password hash)
    """
    try:
        user = get_current_user(g.current_user_id)
        return jsonify(user), 200

    except AuthError as e:
        return jsonify({"error": e.message}), e.status_code


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    """
    POST /api/auth/logout
    In JWT architecture, logout is handled client-side (delete token).
    Server-side we just log the event for audit purposes.
    """
    from app.services.auth_service import _write_audit_log
    _write_audit_log(g.current_user_id, "USER_LOGOUT", {})
@auth_bp.route("/export", methods=["GET"])
@require_auth
def export_my_data():
    """
    GET /api/auth/export
    GDPR Article 20 — Right to data portability.
    Returns all user data as JSON: profile, transactions, budgets, goals.
    """
    try:
        from bson import ObjectId
        from datetime import datetime, timezone

        db = get_db()
        user_id = g.current_user_id

        # ── Helper: convert MongoDB doc to JSON-safe dict ──
        def clean(doc: dict) -> dict:
            cleaned = {}
            for k, v in doc.items():
                if k == "_id":
                    cleaned["id"] = str(v)
                elif isinstance(v, ObjectId):
                    cleaned[k] = str(v)
                elif isinstance(v, datetime):
                    cleaned[k] = v.isoformat()
                else:
                    cleaned[k] = v
            return cleaned

        # ── Fetch user profile ─────────────────────────────
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Remove sensitive fields before export
        user.pop("password_hash", None)
        user.pop("__v", None)

        # ── Fetch all user data ────────────────────────────
        transactions = [clean(t) for t in db.transactions.find({"user_id": user_id})]
        budgets      = [clean(b) for b in db.budgets.find({"user_id": user_id})]
        goals        = [clean(g_) for g_ in db.goals.find({"user_id": user_id})]
        audit_logs   = [clean(a) for a in db.audit_logs.find(
                            {"user_id": user_id},
                            {"_id": 1, "action": 1, "created_at": 1}  # limited fields only
                        )]

        # ── Write audit log for this export ───────────────
        from app.services.auth_service import _write_audit_log
        _write_audit_log(user_id, "GDPR_EXPORT", {"records_exported": len(transactions)})

        return jsonify({
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "gdpr_notice": "This export contains all personal data held by FinSight under GDPR Article 20.",
            "profile":      clean(user),
            "transactions": transactions,
            "budgets":      budgets,
            "goals":        goals,
            "audit_log":    audit_logs,
        }), 200

    except Exception as e:
        return jsonify({"error": "Export failed. Please try again."}), 500
    