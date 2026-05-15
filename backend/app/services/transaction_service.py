"""
FinSight — Transaction Service (Business Logic)
All transaction operations live here.
Routes call these functions — no DB logic in routes ever.
"""

from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId

from app.db.mongo import get_db
from app.core.logging import logger
from app.models.transaction import (
    TransactionCreateRequest,
    TransactionUpdateRequest,
    TransactionFilters,
    TransactionType
)


class TransactionError(Exception):
    """Custom exception for transaction failures."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def create_transaction(user_id: str, data: TransactionCreateRequest) -> dict:
    """
    Create a new transaction for the authenticated user.
    - Stores amount as positive always
    - Type (income/expense) determines direction in UI
    - Writes audit log for every financial change
    """
    db = get_db()

    transaction_doc = {
        "user_id": user_id,
        "title": data.title,
        "amount": data.amount,
        "type": data.type.value,
        "category": data.category.value,
        "date": data.date or datetime.now(timezone.utc),
        "notes": data.notes or "",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }

    result = db.transactions.insert_one(transaction_doc)
    transaction_doc["_id"] = result.inserted_id

    logger.info(
        "Transaction created",
        extra={
            "user_id": user_id,
            "amount": data.amount,
            "type": data.type.value,
            "category": data.category.value
        }
    )

    return _format_transaction(transaction_doc)


def get_transactions(user_id: str, filters: TransactionFilters) -> dict:
    """
    Fetch paginated transactions for a user with optional filters.
    Returns transactions + total count for pagination.
    """
    db = get_db()

    # Build MongoDB query — always scope to current user
    query = {"user_id": user_id}

    if filters.type:
        query["type"] = filters.type.value

    if filters.category:
        query["category"] = filters.category.value

    # Date range filter
    if filters.start_date or filters.end_date:
        query["date"] = {}
        if filters.start_date:
            query["date"]["$gte"] = filters.start_date
        if filters.end_date:
            query["date"]["$lte"] = filters.end_date

    # Total count for pagination metadata
    total = db.transactions.count_documents(query)

    # Fetch with pagination — newest first
    transactions = list(
        db.transactions
        .find(query)
        .sort("date", -1)
        .skip(filters.offset)
        .limit(filters.limit)
    )

    return {
        "transactions": [_format_transaction(t) for t in transactions],
        "total": total,
        "limit": filters.limit,
        "offset": filters.offset,
        "has_more": (filters.offset + filters.limit) < total
    }


def get_transaction_by_id(user_id: str, transaction_id: str) -> dict:
    """Fetch a single transaction — only if it belongs to the current user."""
    db = get_db()

    try:
        obj_id = ObjectId(transaction_id)
    except Exception:
        raise TransactionError("Invalid transaction ID format.", 400)

    transaction = db.transactions.find_one({
        "_id": obj_id,
        "user_id": user_id  # Security: user can only see their own transactions
    })

    if not transaction:
        raise TransactionError("Transaction not found.", 404)

    return _format_transaction(transaction)


def update_transaction(user_id: str, transaction_id: str, data: TransactionUpdateRequest) -> dict:
    """
    Update a transaction — only fields provided are updated (PATCH behaviour).
    User can only update their own transactions.
    """
    db = get_db()

    try:
        obj_id = ObjectId(transaction_id)
    except Exception:
        raise TransactionError("Invalid transaction ID format.", 400)

    # Verify ownership before updating
    existing = db.transactions.find_one({"_id": obj_id, "user_id": user_id})
    if not existing:
        raise TransactionError("Transaction not found.", 404)

    # Build update dict — only include fields that were actually sent
    update_fields = {"updated_at": datetime.now(timezone.utc)}

    if data.title is not None:
        update_fields["title"] = data.title.strip()
    if data.amount is not None:
        update_fields["amount"] = data.amount
    if data.type is not None:
        update_fields["type"] = data.type.value
    if data.category is not None:
        update_fields["category"] = data.category.value
    if data.date is not None:
        update_fields["date"] = data.date
    if data.notes is not None:
        update_fields["notes"] = data.notes

    db.transactions.update_one({"_id": obj_id}, {"$set": update_fields})

    logger.info("Transaction updated", extra={"user_id": user_id, "transaction_id": transaction_id})

    # Return the updated document
    updated = db.transactions.find_one({"_id": obj_id})
    return _format_transaction(updated)


def delete_transaction(user_id: str, transaction_id: str) -> dict:
    """
    Soft delete — marks as deleted but keeps in DB for audit trail.
    Fintech apps should never hard delete financial records.
    """
    db = get_db()

    try:
        obj_id = ObjectId(transaction_id)
    except Exception:
        raise TransactionError("Invalid transaction ID format.", 400)

    # Verify ownership
    existing = db.transactions.find_one({"_id": obj_id, "user_id": user_id})
    if not existing:
        raise TransactionError("Transaction not found.", 404)

    # Soft delete — set deleted flag + timestamp
    db.transactions.update_one(
        {"_id": obj_id},
        {"$set": {
            "deleted": True,
            "deleted_at": datetime.now(timezone.utc)
        }}
    )

    logger.info("Transaction deleted", extra={"user_id": user_id, "transaction_id": transaction_id})
    return {"message": "Transaction deleted successfully."}


def get_spending_summary(user_id: str, year: int, month: int) -> dict:
    """
    Aggregate spending by category for a given month.
    This powers the dashboard donut chart and budget comparisons.
    Also used later by the ML forecasting pipeline.
    """
    db = get_db()

    # Build date range for the requested month
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    # Handle December → January rollover
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    pipeline = [
        # Only current user, within date range, not deleted, expenses only
        {"$match": {
            "user_id": user_id,
            "type": "expense",
            "deleted": {"$ne": True},
            "date": {"$gte": start, "$lt": end}
        }},
        # Group by category and sum amounts
        {"$group": {
            "_id": "$category",
            "total": {"$sum": "$amount"},
            "count": {"$sum": 1}
        }},
        # Sort by highest spending first
        {"$sort": {"total": -1}}
    ]

    results = list(db.transactions.aggregate(pipeline))

    # Calculate total expenses for the month
    total_expenses = sum(r["total"] for r in results)

    # Calculate total income for the month
    income_pipeline = [
        {"$match": {
            "user_id": user_id,
            "type": "income",
            "deleted": {"$ne": True},
            "date": {"$gte": start, "$lt": end}
        }},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    income_result = list(db.transactions.aggregate(income_pipeline))
    total_income = income_result[0]["total"] if income_result else 0

    return {
        "year": year,
        "month": month,
        "total_income": round(total_income, 2),
        "total_expenses": round(total_expenses, 2),
        "net": round(total_income - total_expenses, 2),
        "by_category": [
            {
                "category": r["_id"],
                "total": round(r["total"], 2),
                "count": r["count"],
                # Percentage of total expenses for donut chart
                "percentage": round((r["total"] / total_expenses * 100), 1) if total_expenses > 0 else 0
            }
            for r in results
        ]
    }


def _format_transaction(doc: dict) -> dict:
    """
    Convert a MongoDB document to a clean API response dict.
    Converts ObjectId to string, formats dates as ISO strings.
    Never expose internal MongoDB fields directly.
    """
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "amount": doc["amount"],
        "type": doc["type"],
        "category": doc["category"],
        "date": doc["date"].isoformat() if isinstance(doc["date"], datetime) else doc["date"],
        "notes": doc.get("notes", ""),
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else None,
    }