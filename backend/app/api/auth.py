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
    return jsonify({"message": "Logged out successfully."}), 200