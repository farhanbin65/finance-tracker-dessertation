"""
FinSight — Budget Routes
All routes protected with @require_auth.
"""

from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError

from app.services.budget_service import (
    create_budget,
    get_budgets_with_actuals,
    update_budget,
    delete_budget,
    BudgetError
)
from app.models.budget import BudgetCreateRequest, BudgetUpdateRequest
from app.core.security import require_auth

budgets_bp = Blueprint("budgets", __name__, url_prefix="/api/budgets")


@budgets_bp.route("", methods=["POST"])
@require_auth
def add_budget():
    """
    POST /api/budgets
    Body: { category, limit, month, year, alert_threshold? }
    Returns: created budget
    """
    try:
        data = BudgetCreateRequest(**request.get_json(silent=True) or {})
        result = create_budget(g.current_user_id, data)
        return jsonify(result), 201

    except ValidationError as e:
        first_error = e.errors()[0]["msg"] if e.errors() else "Validation error"
        return jsonify({"error": first_error}), 422

    except BudgetError as e:
        return jsonify({"error": e.message}), e.status_code

    except Exception:
        return jsonify({"error": "Failed to create budget."}), 500


@budgets_bp.route("", methods=["GET"])
@require_auth
def list_budgets():
    """
    GET /api/budgets?year=2026&month=5
    Returns: all budgets with actual spending for the month
    """
    try:
        from datetime import datetime
        now = datetime.now()
        year = int(request.args.get("year", now.year))
        month = int(request.args.get("month", now.month))

        if not (1 <= month <= 12):
            return jsonify({"error": "Month must be between 1 and 12."}), 400

        result = get_budgets_with_actuals(g.current_user_id, year, month)
        return jsonify(result), 200

    except BudgetError as e:
        return jsonify({"error": e.message}), e.status_code

    except Exception:
        return jsonify({"error": "Failed to fetch budgets."}), 500


@budgets_bp.route("/<budget_id>", methods=["PUT"])
@require_auth
def edit_budget(budget_id):
    """
    PUT /api/budgets/:id
    Body: { limit?, alert_threshold? }
    Returns: updated budget
    """
    try:
        data = BudgetUpdateRequest(**request.get_json(silent=True) or {})
        result = update_budget(g.current_user_id, budget_id, data)
        return jsonify(result), 200

    except ValidationError as e:
        first_error = e.errors()[0]["msg"] if e.errors() else "Validation error"
        return jsonify({"error": first_error}), 422

    except BudgetError as e:
        return jsonify({"error": e.message}), e.status_code


@budgets_bp.route("/<budget_id>", methods=["DELETE"])
@require_auth
def remove_budget(budget_id):
    """
    DELETE /api/budgets/:id
    """
    try:
        result = delete_budget(g.current_user_id, budget_id)
        return jsonify(result), 200

    except BudgetError as e:
        return jsonify({"error": e.message}), e.status_code