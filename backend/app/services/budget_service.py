"""
FinSight — Budget Service (Business Logic)
Handles budget creation and tracks actual spending vs limits.
The core logic that makes the budget planner useful.
"""

from datetime import datetime, timezone
from bson import ObjectId

from app.db.mongo import get_db
from app.core.logging import logger
from app.models.budget import BudgetCreateRequest, BudgetUpdateRequest


class BudgetError(Exception):
    """Custom exception for budget failures."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def create_budget(user_id: str, data: BudgetCreateRequest) -> dict:
    """
    Create a monthly budget for a category.
    One budget per category per month — no duplicates allowed.
    """
    db = get_db()

    # Prevent duplicate budgets for same category + month + year
    existing = db.budgets.find_one({
        "user_id": user_id,
        "category": data.category.value,
        "month": data.month,
        "year": data.year,
    })
    if existing:
        raise BudgetError(
            f"A budget for {data.category.value} in {data.month}/{data.year} already exists. "
            f"Use PUT to update it.",
            409
        )

    budget_doc = {
        "user_id": user_id,
        "category": data.category.value,
        "limit": data.limit,
        "month": data.month,
        "year": data.year,
        "alert_threshold": data.alert_threshold,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = db.budgets.insert_one(budget_doc)
    budget_doc["_id"] = result.inserted_id

    logger.info(
        "Budget created",
        extra={
            "user_id": user_id,
            "category": data.category.value,
            "limit": data.limit,
            "month": data.month,
            "year": data.year,
        }
    )

    return _format_budget(budget_doc)


def get_budgets_with_actuals(user_id: str, year: int, month: int) -> dict:
    """
    Fetch all budgets for a month and calculate actual spending for each.
    This is the core budget planner view — shows limit vs spent vs remaining.

    For each budget category we:
    1. Fetch the budget limit the user set
    2. Aggregate actual spending from transactions
    3. Calculate remaining, percentage used, and status
    """
    db = get_db()

    # Fetch all budgets for this month
    budgets = list(db.budgets.find({
        "user_id": user_id,
        "month": month,
        "year": year,
    }))

    if not budgets:
        return {
            "year": year,
            "month": month,
            "budgets": [],
            "summary": {
                "total_budgeted": 0,
                "total_spent": 0,
                "total_remaining": 0,
                "overall_percentage": 0,
            }
        }

    # Build date range for the month
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    end = datetime(year + 1, 1, 1, tzinfo=timezone.utc) if month == 12 \
        else datetime(year, month + 1, 1, tzinfo=timezone.utc)

    # Get actual spending per category in one aggregation query
    # Much more efficient than querying per category separately
    spending_pipeline = [
        {"$match": {
            "user_id": user_id,
            "type": "expense",
            "deleted": {"$ne": True},
            "date": {"$gte": start, "$lt": end},
            # Only aggregate categories that have budgets
            "category": {"$in": [b["category"] for b in budgets]}
        }},
        {"$group": {
            "_id": "$category",
            "spent": {"$sum": "$amount"},
            "transaction_count": {"$sum": 1}
        }}
    ]

    spending_results = {
        r["_id"]: r
        for r in db.transactions.aggregate(spending_pipeline)
    }

    # Combine budget limits with actual spending
    budget_items = []
    total_budgeted = 0
    total_spent = 0

    for budget in budgets:
        category = budget["category"]
        limit = budget["limit"]
        spending = spending_results.get(category, {})
        spent = round(spending.get("spent", 0), 2)
        transaction_count = spending.get("transaction_count", 0)

        remaining = round(limit - spent, 2)
        percentage_used = round((spent / limit * 100), 1) if limit > 0 else 0

        # Status logic — drives colour coding in the UI
        if percentage_used >= 100:
            status = "over_budget"       # Red
        elif percentage_used >= budget.get("alert_threshold", 80):
            status = "warning"           # Amber
        else:
            status = "on_track"          # Green

        total_budgeted += limit
        total_spent += spent

        budget_items.append({
            "id": str(budget["_id"]),
            "category": category,
            "limit": limit,
            "spent": spent,
            "remaining": remaining,
            "percentage_used": percentage_used,
            "status": status,
            "alert_threshold": budget.get("alert_threshold", 80),
            "transaction_count": transaction_count,
            "month": month,
            "year": year,
        })

    # Sort by percentage used descending — most at-risk budgets first
    budget_items.sort(key=lambda x: x["percentage_used"], reverse=True)

    total_remaining = round(total_budgeted - total_spent, 2)
    overall_percentage = round((total_spent / total_budgeted * 100), 1) \
        if total_budgeted > 0 else 0

    return {
        "year": year,
        "month": month,
        "budgets": budget_items,
        "summary": {
            "total_budgeted": round(total_budgeted, 2),
            "total_spent": round(total_spent, 2),
            "total_remaining": total_remaining,
            "overall_percentage": overall_percentage,
        }
    }


def update_budget(user_id: str, budget_id: str, data: BudgetUpdateRequest) -> dict:
    """Update an existing budget limit or alert threshold."""
    db = get_db()

    try:
        obj_id = ObjectId(budget_id)
    except Exception:
        raise BudgetError("Invalid budget ID format.", 400)

    existing = db.budgets.find_one({"_id": obj_id, "user_id": user_id})
    if not existing:
        raise BudgetError("Budget not found.", 404)

    update_fields = {"updated_at": datetime.now(timezone.utc)}

    if data.limit is not None:
        update_fields["limit"] = data.limit
    if data.alert_threshold is not None:
        update_fields["alert_threshold"] = data.alert_threshold

    db.budgets.update_one({"_id": obj_id}, {"$set": update_fields})

    logger.info("Budget updated", extra={"user_id": user_id, "budget_id": budget_id})

    updated = db.budgets.find_one({"_id": obj_id})
    return _format_budget(updated)


def delete_budget(user_id: str, budget_id: str) -> dict:
    """Delete a budget — hard delete is fine here (not financial records)."""
    db = get_db()

    try:
        obj_id = ObjectId(budget_id)
    except Exception:
        raise BudgetError("Invalid budget ID format.", 400)

    existing = db.budgets.find_one({"_id": obj_id, "user_id": user_id})
    if not existing:
        raise BudgetError("Budget not found.", 404)

    db.budgets.delete_one({"_id": obj_id})
    logger.info("Budget deleted", extra={"user_id": user_id, "budget_id": budget_id})

    return {"message": "Budget deleted successfully."}


def _format_budget(doc: dict) -> dict:
    """Convert MongoDB budget document to clean API response."""
    return {
        "id":              str(doc["_id"]),
        "category":        doc["category"],
        "limit":           doc["limit"],
        "month":           doc["month"],
        "year":            doc["year"],
        "alert_threshold": doc.get("alert_threshold", 80.0),  # safe default
        "created_at":      doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else None,
    }