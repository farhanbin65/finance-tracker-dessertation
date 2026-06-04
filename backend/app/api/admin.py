"""
FinSight — Admin API Routes
All routes require admin role via @require_admin decorator.
Provides platform-wide visibility for system administrators.

Endpoints:
  GET  /api/admin/stats         — platform statistics
  GET  /api/admin/users         — all users list
  GET  /api/admin/users/:id     — single user detail + their data
  DELETE /api/admin/users/:id   — delete user and all their data
    POST /api/admin/users/:id/ban — toggle a user's ban status
  GET  /api/admin/transactions  — all transactions across all users
"""

from flask import Blueprint, jsonify, request
from app.core.security import require_admin
from app.db.mongo import get_db
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import calendar

db = get_db()

admin_bp = Blueprint("admin", __name__)


def _fmt_id(doc: dict) -> dict:
    """Convert MongoDB ObjectId to string for JSON serialisation."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def _safe_str(val) -> str:
    """Safely convert any value to string."""
    return str(val) if val else ""


# ── Platform Stats ────────────────────────────────────────────────

@admin_bp.route("/stats", methods=["GET"])
@require_admin
def get_platform_stats():
    """
    Returns high-level platform statistics.
    Used for the admin dashboard overview cards.
    """
    try:
        total_users        = db.users.count_documents({})
        total_transactions = db.transactions.count_documents({})
        total_budgets      = db.budgets.count_documents({})
        total_goals        = db.goals.count_documents({})

        # Total money tracked across all transactions
        pipeline = [
            {"$group": {
                "_id":           "$type",
                "total":         {"$sum": "$amount"},
                "count":         {"$sum": 1}
            }}
        ]
        type_totals = {
            doc["_id"]: {"total": doc["total"], "count": doc["count"]}
            for doc in db.transactions.aggregate(pipeline)
        }

        # New users in last 30 days
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        new_users_30d = db.users.count_documents({
            "created_at": {"$gte": thirty_days_ago}
        })

        return jsonify({
            "total_users":        total_users,
            "total_transactions": total_transactions,
            "total_budgets":      total_budgets,
            "total_goals":        total_goals,
            "new_users_30d":      new_users_30d,
            "total_income":       type_totals.get("income",  {}).get("total", 0),
            "total_expenses":     type_totals.get("expense", {}).get("total", 0),
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Users ─────────────────────────────────────────────────────────

@admin_bp.route("/users", methods=["GET"])
@require_admin
def get_all_users():
    """
    Returns all registered users with their activity summary.
    Excludes password_hash for security.
    """
    try:
        users = list(db.users.find({}, {"password_hash": 0}))

        result = []
        for user in users:
            user_id = user["_id"]
            tx_count     = db.transactions.count_documents({"user_id": str(user_id)})
            budget_count = db.budgets.count_documents({"user_id": str(user_id)})
            goal_count   = db.goals.count_documents({"user_id": str(user_id)})

            result.append({
                "id":           str(user_id),
                "full_name":    user.get("full_name", ""),
                "email":        user.get("email", ""),
                "role":         user.get("role", "user"),
                "currency":     user.get("currency", "GBP"),
                "created_at":   user.get("created_at", "").isoformat()
                                if hasattr(user.get("created_at", ""), "isoformat") else "",
                "tx_count":     tx_count,
                "budget_count": budget_count,
                "goal_count":   goal_count,
            })

        # Sort by newest first
        result.sort(key=lambda x: x["created_at"], reverse=True)

        return jsonify({"users": result, "total": len(result)}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/users/<user_id>", methods=["GET"])
@require_admin
def get_user_detail(user_id: str):
    """Returns a single user's full profile + all their data."""
    try:
        user = db.users.find_one(
            {"_id": ObjectId(user_id)},
            {"password_hash": 0}
        )
        if not user:
            return jsonify({"error": "User not found"}), 404

        transactions = list(db.transactions.find({"user_id": user_id}))
        budgets      = list(db.budgets.find({"user_id": user_id}))
        goals        = list(db.goals.find({"user_id": user_id}))

        return jsonify({
            "user":         _fmt_id(user),
            "transactions": [_fmt_id(t) for t in transactions],
            "budgets":      [_fmt_id(b) for b in budgets],
            "goals":        [_fmt_id(g) for g in goals],
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/users/<user_id>", methods=["DELETE"])
@require_admin
def delete_user(user_id: str):
    """
    Deletes a user and ALL their associated data.
    Cascading delete: transactions, budgets, goals, chat history.
    Cannot delete other admin accounts for safety.
    """
    try:
        from flask import g as flask_g

        # Prevent self-deletion
        if user_id == flask_g.current_user_id:
            return jsonify({"error": "Cannot delete your own admin account"}), 400

        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Prevent deleting other admins
        if user.get("role") == "admin":
            return jsonify({"error": "Cannot delete another admin account"}), 403

        # Cascade delete all user data
        db.transactions.delete_many({"user_id": user_id})
        db.budgets.delete_many({"user_id": user_id})
        db.goals.delete_many({"user_id": user_id})
        db.chat_messages.delete_many({"user_id": user_id})
        db.users.delete_one({"_id": ObjectId(user_id)})

        return jsonify({
            "message": f"User {user.get('email')} and all their data deleted successfully"
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/users/<user_id>/ban", methods=["POST"])
@require_admin
def ban_user(user_id: str):
    """
    Toggle ban status on a user account.
    Banned users cannot login — checked in auth.py login route.
    Cannot ban admin accounts.
    """
    try:
        from flask import g as flask_g

        if user_id == flask_g.current_user_id:
            return jsonify({"error": "Cannot ban your own account"}), 400

        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        if user.get("role") == "admin":
            return jsonify({"error": "Cannot ban an admin account"}), 403

        # Toggle ban
        new_status = not user.get("is_banned", False)
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"is_banned": new_status}}
        )

        return jsonify({
            "message": f"User {'banned' if new_status else 'unbanned'} successfully",
            "is_banned": new_status
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── All Transactions ──────────────────────────────────────────────

@admin_bp.route("/transactions", methods=["GET"])
@require_admin
def get_all_transactions():
    """
    Returns all transactions across all users.
    Includes user email for context. Paginated — 50 per page.
    """
    try:
        page  = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 50))
        skip  = (page - 1) * limit

        transactions = list(
            db.transactions.find({})
            .sort("date", -1)
            .skip(skip)
            .limit(limit)
        )

        # Enrich with user email
        result = []
        for tx in transactions:
            user = db.users.find_one(
                {"_id": ObjectId(tx.get("user_id", ""))},
                {"email": 1}
            ) if tx.get("user_id") else None

            result.append({
                "id":         str(tx["_id"]),
                "user_email": user.get("email", "unknown") if user else "unknown",
                "title":      tx.get("title", ""),
                "amount":     tx.get("amount", 0),
                "type":       tx.get("type", ""),
                "category":   tx.get("category", ""),
                "date":       tx.get("date", "").isoformat()
                              if hasattr(tx.get("date", ""), "isoformat") else str(tx.get("date", "")),
            })

        total = db.transactions.count_documents({})

        return jsonify({
            "transactions": result,
            "total":        total,
            "page":         page,
            "pages":        (total + limit - 1) // limit,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/charts", methods=["GET"])
@require_admin
@admin_bp.route("/charts", methods=["GET"])
@require_admin
def get_platform_charts():
    try:
        # ── Spending by category ──
        cat_pipeline = [
            {"$match": {"type": "expense"}},
            {"$group": {
                "_id":   "$category",
                "total": {"$sum": "$amount"}
            }},
            {"$sort": {"total": -1}}
        ]
        cat_data = [
            {"name": doc["_id"], "value": round(doc["total"], 2)}
            for doc in db.transactions.aggregate(cat_pipeline)
        ]

        # ── Monthly income vs expenses (last 6 months) ──
        six_months_ago = datetime.now(timezone.utc) - timedelta(days=180)

        monthly_pipeline = [
            {"$match": {"date": {"$gte": six_months_ago}}},
            {"$group": {
                "_id": {
                    "year":  {"$year":  "$date"},
                    "month": {"$month": "$date"},
                    "type":  "$type"
                },
                "total": {"$sum": "$amount"}
            }},
            {"$sort": {"_id.year": 1, "_id.month": 1}}
        ]

        month_map: dict = {}
        for doc in db.transactions.aggregate(monthly_pipeline):
            yr  = doc["_id"]["year"]
            mo  = doc["_id"]["month"]
            key = f"{yr}-{mo:02d}"
            if key not in month_map:
                month_map[key] = {
                    "month":    calendar.month_abbr[mo] + f" {str(yr)[2:]}",
                    "income":   0,
                    "expenses": 0,
                }
            if doc["_id"]["type"] == "income":
                month_map[key]["income"]   = round(doc["total"], 2)
            else:
                month_map[key]["expenses"] = round(doc["total"], 2)

        monthly_data = list(month_map.values())

        return jsonify({
            "by_category": cat_data,
            "monthly":     monthly_data,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500