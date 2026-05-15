"""
FinSight — Transaction Routes
Thin HTTP layer — all logic is in transaction_service.py.
All routes are protected with @require_auth.
"""

from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError

from app.services.transaction_service import (
    create_transaction,
    get_transactions,
    get_transaction_by_id,
    update_transaction,
    delete_transaction,
    get_spending_summary,
    TransactionError
)
from app.models.transaction import (
    TransactionCreateRequest,
    TransactionUpdateRequest,
    TransactionFilters,
    TransactionType,
    TransactionCategory
)
from app.core.security import require_auth

transactions_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")


@transactions_bp.route("", methods=["POST"])
@require_auth
def add_transaction():
    """
    POST /api/transactions
    Body: { title, amount, type, category, date?, notes? }
    Returns: created transaction object
    """
    try:
        data = TransactionCreateRequest(**request.get_json(silent=True) or {})
        result = create_transaction(g.current_user_id, data)
        return jsonify(result), 201

    except ValidationError as e:
        first_error = e.errors()[0]["msg"] if e.errors() else "Validation error"
        return jsonify({"error": first_error}), 422

    except TransactionError as e:
        return jsonify({"error": e.message}), e.status_code

    except Exception as e:
        return jsonify({"error": "Failed to create transaction."}), 500


@transactions_bp.route("", methods=["GET"])
@require_auth
def list_transactions():
    """
    GET /api/transactions
    Query params: type, category, start_date, end_date, limit, offset
    Returns: paginated transaction list + metadata
    """
    try:
        # Parse query parameters safely
        params = {
            "limit": int(request.args.get("limit", 50)),
            "offset": int(request.args.get("offset", 0)),
        }
        if request.args.get("type"):
            params["type"] = request.args.get("type")
        if request.args.get("category"):
            params["category"] = request.args.get("category")
        if request.args.get("start_date"):
            from datetime import datetime
            params["start_date"] = datetime.fromisoformat(request.args.get("start_date"))
        if request.args.get("end_date"):
            from datetime import datetime
            params["end_date"] = datetime.fromisoformat(request.args.get("end_date"))

        filters = TransactionFilters(**params)
        result = get_transactions(g.current_user_id, filters)
        return jsonify(result), 200

    except ValidationError as e:
        first_error = e.errors()[0]["msg"] if e.errors() else "Validation error"
        return jsonify({"error": first_error}), 422

    except Exception as e:
        return jsonify({"error": "Failed to fetch transactions."}), 500


@transactions_bp.route("/<transaction_id>", methods=["GET"])
@require_auth
def get_transaction(transaction_id):
    """
    GET /api/transactions/:id
    Returns: single transaction (only if owned by current user)
    """
    try:
        result = get_transaction_by_id(g.current_user_id, transaction_id)
        return jsonify(result), 200

    except TransactionError as e:
        return jsonify({"error": e.message}), e.status_code


@transactions_bp.route("/<transaction_id>", methods=["PUT"])
@require_auth
def edit_transaction(transaction_id):
    """
    PUT /api/transactions/:id
    Body: any subset of { title, amount, type, category, date, notes }
    Returns: updated transaction
    """
    try:
        data = TransactionUpdateRequest(**request.get_json(silent=True) or {})
        result = update_transaction(g.current_user_id, transaction_id, data)
        return jsonify(result), 200

    except ValidationError as e:
        first_error = e.errors()[0]["msg"] if e.errors() else "Validation error"
        return jsonify({"error": first_error}), 422

    except TransactionError as e:
        return jsonify({"error": e.message}), e.status_code


@transactions_bp.route("/<transaction_id>", methods=["DELETE"])
@require_auth
def remove_transaction(transaction_id):
    """
    DELETE /api/transactions/:id
    Soft deletes — keeps record in DB for audit trail
    """
    try:
        result = delete_transaction(g.current_user_id, transaction_id)
        return jsonify(result), 200

    except TransactionError as e:
        return jsonify({"error": e.message}), e.status_code


@transactions_bp.route("/summary/monthly", methods=["GET"])
@require_auth
def monthly_summary():
    """
    GET /api/transactions/summary/monthly?year=2026&month=5
    Returns: spending by category + income vs expenses for the month
    Powers the dashboard donut chart.
    """
    try:
        from datetime import datetime
        now = datetime.now()
        year = int(request.args.get("year", now.year))
        month = int(request.args.get("month", now.month))

        if not (1 <= month <= 12):
            return jsonify({"error": "Month must be between 1 and 12."}), 400

        result = get_spending_summary(g.current_user_id, year, month)
        return jsonify(result), 200

    except TransactionError as e:
        return jsonify({"error": e.message}), e.status_code

    except Exception as e:
        return jsonify({"error": "Failed to generate summary."}), 500


@transactions_bp.route("/meta/categories", methods=["GET"])
def get_categories():
    """
    GET /api/transactions/meta/categories
    Returns all valid categories — used by frontend dropdowns.
    No auth required — public metadata.
    """
    return jsonify({
        "categories": [c.value for c in TransactionCategory],
        "types": [t.value for t in TransactionType]
    }), 200