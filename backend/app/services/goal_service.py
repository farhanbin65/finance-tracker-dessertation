"""
FinSight — Savings Goal Service (Business Logic)
Fixes:
  1. Consistent field name: always 'name' not 'goal_name'
  2. Emoji encoding: explicit UTF-8 safe handling
  3. update_goal was storing 'name' but create was storing 'goal_name'
"""

from datetime import datetime, timezone
from bson import ObjectId

from app.db.mongo import get_db
from app.core.logging import logger
from app.models.goal import GoalCreateRequest, GoalUpdateRequest, AddMoneyRequest


class GoalError(Exception):
    """Custom exception for goal failures."""
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _safe_emoji(value) -> str:
    """
    Safely decode emoji from any format MongoDB might return.
    Handles: str, bytes, None, '??' corruption.
    """
    if value is None:
        return "🎯"
    # If MongoDB returned bytes instead of str
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8")
        except UnicodeDecodeError:
            return "🎯"
    # If stored as string but corrupted
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped or stripped == "??" or stripped == "???":
            return "🎯"
        return stripped
    return "🎯"


def create_goal(user_id: str, data: GoalCreateRequest) -> dict:
    """
    Create a new savings goal.
    Starts with zero saved — user adds money via deposits.
    """
    db = get_db()

    goal_doc = {
        "user_id":        user_id,
        # ✅ Fix 1: always store as 'name' — was 'goal_name' before
        "name":           data.name,
        "target_amount":  data.target_amount,
        "saved_amount":   0.0,
        "target_date":    data.target_date,
        # ✅ Fix 2: safe emoji storage
        "emoji":          _safe_emoji(data.emoji) if data.emoji else "🎯",
        "notes":          data.notes or "",
        "is_completed":   False,
        "completed_at":   None,
        "created_at":     datetime.now(timezone.utc),
        "updated_at":     datetime.now(timezone.utc),
    }

    result = db.goals.insert_one(goal_doc)
    goal_doc["_id"] = result.inserted_id

    logger.info("Goal created", extra={
        "user_id": user_id,
        "goal_name": data.name,
        "target_amount": data.target_amount,
    })

    return _format_goal(goal_doc)


def get_goals(user_id: str) -> dict:
    """
    Fetch all savings goals for a user.
    Returns active goals first, then completed ones.
    """
    db = get_db()

    goals = list(db.goals.find({"user_id": user_id}).sort("created_at", -1))

    active    = [g for g in goals if not g.get("is_completed", False)]
    completed = [g for g in goals if g.get("is_completed", False)]

    total_saved  = sum(g.get("saved_amount", 0) for g in active)
    total_target = sum(g.get("target_amount", 0) for g in active)

    return {
        "goals": [_format_goal(g) for g in active + completed],
        "summary": {
            "total_goals":      len(goals),
            "active_goals":     len(active),
            "completed_goals":  len(completed),
            "total_saved":      round(total_saved, 2),
            "total_target":     round(total_target, 2),
        }
    }


def get_goal_by_id(user_id: str, goal_id: str) -> dict:
    """Fetch a single goal with its full deposit history."""
    db = get_db()

    try:
        obj_id = ObjectId(goal_id)
    except Exception:
        raise GoalError("Invalid goal ID format.", 400)

    goal = db.goals.find_one({"_id": obj_id, "user_id": user_id})
    if not goal:
        raise GoalError("Goal not found.", 404)

    deposits = list(
        db.goal_deposits
        .find({"goal_id": goal_id})
        .sort("created_at", -1)
    )

    formatted = _format_goal(goal)
    formatted["deposits"] = [_format_deposit(d) for d in deposits]
    return formatted


def add_money_to_goal(user_id: str, goal_id: str, data: AddMoneyRequest) -> dict:
    """
    Deposit money into a savings goal.
    Updates saved_amount, records deposit, marks complete if target reached.
    """
    db = get_db()

    try:
        obj_id = ObjectId(goal_id)
    except Exception:
        raise GoalError("Invalid goal ID format.", 400)

    goal = db.goals.find_one({"_id": obj_id, "user_id": user_id})
    if not goal:
        raise GoalError("Goal not found.", 404)

    if goal.get("is_completed"):
        raise GoalError("This goal is already completed.", 400)

    new_saved    = round(goal["saved_amount"] + data.amount, 2)
    is_completed = new_saved >= goal["target_amount"]

    update_fields = {
        "saved_amount": new_saved,
        "updated_at":   datetime.now(timezone.utc),
    }
    if is_completed:
        update_fields["is_completed"]  = True
        update_fields["completed_at"]  = datetime.now(timezone.utc)

    db.goals.update_one({"_id": obj_id}, {"$set": update_fields})

    deposit_doc = {
        "goal_id":    goal_id,
        "user_id":    user_id,
        "amount":     data.amount,
        "notes":      data.notes or "",
        "created_at": datetime.now(timezone.utc),
    }
    db.goal_deposits.insert_one(deposit_doc)

    logger.info("Goal deposit made", extra={
        "user_id": user_id,
        "goal_id": goal_id,
        "amount":  data.amount,
    })

    updated_goal = db.goals.find_one({"_id": obj_id})
    result = _format_goal(updated_goal)

    if is_completed:
        goal_name = goal.get("name") or goal.get("goal_name", "")
        result["message"] = f"Congratulations! You have reached your goal: {goal_name}!"

    return result


def update_goal(user_id: str, goal_id: str, data: GoalUpdateRequest) -> dict:
    """Update goal details — name, target, date, emoji."""
    db = get_db()

    try:
        obj_id = ObjectId(goal_id)
    except Exception:
        raise GoalError("Invalid goal ID format.", 400)

    existing = db.goals.find_one({"_id": obj_id, "user_id": user_id})
    if not existing:
        raise GoalError("Goal not found.", 404)

    update_fields = {"updated_at": datetime.now(timezone.utc)}

    if data.name is not None:
        # ✅ Consistent field name — always 'name'
        update_fields["name"] = data.name.strip()
    if data.target_amount is not None:
        update_fields["target_amount"] = data.target_amount
    if data.target_date is not None:
        update_fields["target_date"] = data.target_date
    if data.emoji is not None:
        # ✅ Safe emoji on update too
        update_fields["emoji"] = _safe_emoji(data.emoji)
    if data.notes is not None:
        update_fields["notes"] = data.notes

    db.goals.update_one({"_id": obj_id}, {"$set": update_fields})

    logger.info("Goal updated", extra={"user_id": user_id, "goal_id": goal_id})

    updated = db.goals.find_one({"_id": obj_id})
    return _format_goal(updated)


def delete_goal(user_id: str, goal_id: str) -> dict:
    """Delete a goal and its deposit history."""
    db = get_db()

    try:
        obj_id = ObjectId(goal_id)
    except Exception:
        raise GoalError("Invalid goal ID format.", 400)

    existing = db.goals.find_one({"_id": obj_id, "user_id": user_id})
    if not existing:
        raise GoalError("Goal not found.", 404)

    db.goals.delete_one({"_id": obj_id})
    db.goal_deposits.delete_many({"goal_id": goal_id})

    logger.info("Goal deleted", extra={"user_id": user_id, "goal_id": goal_id})
    return {"message": "Goal deleted successfully."}


def _format_goal(doc: dict) -> dict:
    """
    Convert MongoDB goal document to clean API response.
    ✅ Handles both 'name' and legacy 'goal_name' field
    ✅ Safe emoji decoding
    """
    target    = doc["target_amount"]
    saved     = doc.get("saved_amount", 0)
    remaining = round(target - saved, 2)
    percentage = round((saved / target * 100), 1) if target > 0 else 0

    target_date   = doc.get("target_date")
    days_remaining = None
    if target_date:
        if target_date.tzinfo is None:
            target_date = target_date.replace(tzinfo=timezone.utc)
        delta          = target_date - datetime.now(timezone.utc)
        days_remaining = max(0, delta.days)

    return {
        "id":            str(doc["_id"]),
        # ✅ Fix 3: handle both old 'goal_name' and new 'name' field
        "name":          doc.get("name") or doc.get("goal_name", "Unnamed Goal"),
        # ✅ Fix 4: safe emoji — never returns '??' to frontend
        "emoji":         _safe_emoji(doc.get("emoji")),
        "target_amount": target,
        "saved_amount":  round(saved, 2),
        "remaining":     remaining,
        "percentage":    percentage,
        "target_date":   target_date.isoformat() if target_date else None,
        "days_remaining": days_remaining,
        "is_completed":  doc.get("is_completed", False),
        "completed_at":  doc["completed_at"].isoformat() if doc.get("completed_at") else None,
        "notes":         doc.get("notes", ""),
        "created_at":    doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else None,
    }


def _format_deposit(doc: dict) -> dict:
    """Convert MongoDB deposit document to clean API response."""
    return {
        "id":         str(doc["_id"]),
        "amount":     doc["amount"],
        "notes":      doc.get("notes", ""),
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else None,
    }