"""
FinSight — Savings Goals Routes
All routes protected with @require_auth.
"""

import json

from flask import Blueprint, request, make_response, g
from pydantic import ValidationError

from app.services.goal_service import (
    create_goal,
    get_goals,
    get_goal_by_id,
    add_money_to_goal,
    update_goal,
    delete_goal,
    GoalError
)
from app.models.goal import GoalCreateRequest, GoalUpdateRequest, AddMoneyRequest
from app.core.security import require_auth

goals_bp = Blueprint("goals", __name__, url_prefix="/api/goals")


def json_response(data, status=200):
    """UTF-8 safe JSON response that preserves Unicode characters."""
    response = make_response(json.dumps(data, ensure_ascii=False), status)
    response.headers["Content-Type"] = "application/json; charset=utf-8"
    return response


@goals_bp.route("", methods=["POST"])
@require_auth
def add_goal():
    """
    POST /api/goals
    Body: { name, target_amount, target_date, emoji?, notes? }
    Returns: created goal
    """
    try:
        data = GoalCreateRequest(**request.get_json(silent=True) or {})
        result = create_goal(g.current_user_id, data)
        return json_response(result, 201)

    except ValidationError as e:
        first_error = e.errors()[0]["msg"] if e.errors() else "Validation error"
        return json_response({"error": first_error}, 422)

    except GoalError as e:
        return json_response({"error": e.message}, e.status_code)

    except Exception:
        return json_response({"error": "Failed to create goal."}, 500)

@goals_bp.route("", methods=["GET"])
@require_auth
def list_goals():
    """
    GET /api/goals
    Returns: all goals with summary stats
    """
    try:
        result = get_goals(g.current_user_id)
        return json_response(result, 200)

    except Exception as e:
            import traceback
            traceback.print_exc()
            return json_response({"error": str(e)}, 500)


@goals_bp.route("/<goal_id>", methods=["GET"])
@require_auth
def get_goal(goal_id):
    """
    GET /api/goals/:id
    Returns: single goal with full deposit history
    """
    try:
        result = get_goal_by_id(g.current_user_id, goal_id)
        return json_response(result, 200)

    except GoalError as e:
        return json_response({"error": e.message}, e.status_code)


@goals_bp.route("/<goal_id>/deposit", methods=["POST"])
@require_auth
def deposit_to_goal(goal_id):
    """
    POST /api/goals/:id/deposit
    Body: { amount, notes? }
    Returns: updated goal with new saved_amount and percentage
    """
    try:
        data = AddMoneyRequest(**request.get_json(silent=True) or {})
        result = add_money_to_goal(g.current_user_id, goal_id, data)
        return json_response(result, 200)

    except ValidationError as e:
        first_error = e.errors()[0]["msg"] if e.errors() else "Validation error"
        return json_response({"error": first_error}, 422)

    except GoalError as e:
        return json_response({"error": e.message}, e.status_code)


@goals_bp.route("/<goal_id>", methods=["PUT"])
@require_auth
def edit_goal(goal_id):
    """
    PUT /api/goals/:id
    Body: any subset of { name, target_amount, target_date, emoji, notes }
    """
    try:
        data = GoalUpdateRequest(**request.get_json(silent=True) or {})
        result = update_goal(g.current_user_id, goal_id, data)
        return json_response(result, 200)

    except ValidationError as e:
        first_error = e.errors()[0]["msg"] if e.errors() else "Validation error"
        return json_response({"error": first_error}, 422)

    except GoalError as e:
        return json_response({"error": e.message}, e.status_code)


@goals_bp.route("/<goal_id>", methods=["DELETE"])
@require_auth
def remove_goal(goal_id):
    """
    DELETE /api/goals/:id
    Deletes goal and all deposit history
    """
    try:
        result = delete_goal(g.current_user_id, goal_id)
        return json_response(result, 200)

    except GoalError as e:
        return json_response({"error": e.message}, e.status_code)