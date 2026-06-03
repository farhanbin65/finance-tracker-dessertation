"""
FinSight — Rich Seed Data Script
Creates 3 months of realistic transactions, budgets and goals
for the test account so SHAP has enough data to train on.

Usage: python seed_data.py
Run from: backend/
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.mongo import get_db
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import random

db = get_db()

# ── Target account ─────────────────────────────────────────────────
TARGET_EMAIL = "test@finsght.com"  # typo is intentional

user = db.users.find_one({"email": TARGET_EMAIL})
if not user:
    print(f"❌ User {TARGET_EMAIL} not found. Register first.")
    sys.exit(1)

user_id = str(user["_id"])
print(f"✅ Found user: {user['full_name']} ({TARGET_EMAIL})")

# ── Clear existing data ────────────────────────────────────────────
db.transactions.delete_many({"user_id": user_id})
db.budgets.delete_many({"user_id": user_id})
db.goals.delete_many({"user_id": user_id})
print("🗑️  Cleared existing data")

# ── Helper ─────────────────────────────────────────────────────────
def make_date(months_ago: int, day: int) -> datetime:
    now   = datetime.now(timezone.utc)
    month = now.month - months_ago
    year  = now.year
    while month <= 0:
        month += 12
        year  -= 1
    day = min(day, 28)
    return datetime(year, month, day, tzinfo=timezone.utc)

def tx(title, amount, type_, category, months_ago, day, notes=""):
    return {
        "_id":       ObjectId(),
        "user_id":   user_id,
        "title":     title,
        "amount":    round(amount, 2),
        "type":      type_,
        "category":  category,
        "date":      make_date(months_ago, day),
        "notes":     notes,
        "created_at": datetime.now(timezone.utc),
    }

# ── 3 months of transactions ───────────────────────────────────────
transactions = [

    # ══ 3 MONTHS AGO ══════════════════════════════════════════════
    tx("Student Loan",        1400, "income",  "Salary",         3, 1),
    tx("Part-time Job",        320, "income",  "Salary",         3, 15),
    tx("Rent",                 650, "expense", "Rent",           3, 1),
    tx("Tesco Weekly Shop",     62, "expense", "Food",           3, 3),
    tx("Tesco Weekly Shop",     54, "expense", "Food",           3, 10),
    tx("Tesco Weekly Shop",     71, "expense", "Food",           3, 17),
    tx("Tesco Weekly Shop",     58, "expense", "Food",           3, 24),
    tx("McDonald's",            12, "expense", "Food",           3, 6),
    tx("Deliveroo",             18, "expense", "Food",           3, 20),
    tx("Uber",                  14, "expense", "Transport",      3, 5),
    tx("Uber",                  11, "expense", "Transport",      3, 14),
    tx("Bus Pass",              40, "expense", "Transport",      3, 1),
    tx("Netflix",               15, "expense", "Subscriptions",  3, 5),
    tx("Spotify",               10, "expense", "Subscriptions",  3, 5),
    tx("Amazon Prime",           9, "expense", "Subscriptions",  3, 5),
    tx("ASOS Jacket",           45, "expense", "Shopping",       3, 8),
    tx("Primark",               32, "expense", "Shopping",       3, 16),
    tx("Electric Bill",         48, "expense", "Utilities",      3, 2),
    tx("Water Bill",            22, "expense", "Utilities",      3, 2),
    tx("Gym Membership",        25, "expense", "Health",         3, 1),
    tx("Pharmacy",               8, "expense", "Health",         3, 18),
    tx("Cinema",                14, "expense", "Entertainment",  3, 22),
    tx("Bowling Night",         20, "expense", "Entertainment",  3, 28),

    # ══ 2 MONTHS AGO ══════════════════════════════════════════════
    tx("Student Loan",        1400, "income",  "Salary",         2, 1),
    tx("Part-time Job",        380, "income",  "Salary",         2, 15),
    tx("Rent",                 650, "expense", "Rent",           2, 1),
    tx("Tesco Weekly Shop",     68, "expense", "Food",           2, 4),
    tx("Tesco Weekly Shop",     59, "expense", "Food",           2, 11),
    tx("Tesco Weekly Shop",     74, "expense", "Food",           2, 18),
    tx("Tesco Weekly Shop",     61, "expense", "Food",           2, 25),
    tx("KFC",                   11, "expense", "Food",           2, 7),
    tx("Just Eat",              22, "expense", "Food",           2, 19),
    tx("Starbucks",              5, "expense", "Food",           2, 13),
    tx("Uber",                  13, "expense", "Transport",      2, 6),
    tx("Uber",                  16, "expense", "Transport",      2, 20),
    tx("Bus Pass",              40, "expense", "Transport",      2, 1),
    tx("Train Ticket",          28, "expense", "Transport",      2, 12),
    tx("Netflix",               15, "expense", "Subscriptions",  2, 5),
    tx("Spotify",               10, "expense", "Subscriptions",  2, 5),
    tx("Amazon Prime",           9, "expense", "Subscriptions",  2, 5),
    tx("YouTube Premium",        8, "expense", "Subscriptions",  2, 5),
    tx("Nike Trainers",         89, "expense", "Shopping",       2, 9),
    tx("Boots",                 24, "expense", "Shopping",       2, 21),
    tx("Electric Bill",         52, "expense", "Utilities",      2, 2),
    tx("Water Bill",            22, "expense", "Utilities",      2, 2),
    tx("Broadband",             35, "expense", "Utilities",      2, 2),
    tx("Gym Membership",        25, "expense", "Health",         2, 1),
    tx("Dentist",               50, "expense", "Health",         2, 14),
    tx("Pub Night",             35, "expense", "Entertainment",  2, 8),
    tx("Spotify Concert",       45, "expense", "Entertainment",  2, 23),

    # ══ LAST MONTH ════════════════════════════════════════════════
    tx("Student Loan",        1400, "income",  "Salary",         1, 1),
    tx("Part-time Job",        350, "income",  "Salary",         1, 15),
    tx("Freelance Work",       200, "income",  "Salary",         1, 20),
    tx("Rent",                 650, "expense", "Rent",           1, 1),
    tx("Tesco Weekly Shop",     72, "expense", "Food",           1, 3),
    tx("Tesco Weekly Shop",     65, "expense", "Food",           1, 10),
    tx("Tesco Weekly Shop",     78, "expense", "Food",           1, 17),
    tx("Tesco Weekly Shop",     69, "expense", "Food",           1, 24),
    tx("Deliveroo",             25, "expense", "Food",           1, 5),
    tx("Deliveroo",             19, "expense", "Food",           1, 16),
    tx("Nando's",               22, "expense", "Food",           1, 28),
    tx("Uber",                  15, "expense", "Transport",      1, 4),
    tx("Uber",                  12, "expense", "Transport",      1, 18),
    tx("Uber",                  18, "expense", "Transport",      1, 25),
    tx("Bus Pass",              40, "expense", "Transport",      1, 1),
    tx("Netflix",               15, "expense", "Subscriptions",  1, 5),
    tx("Spotify",               10, "expense", "Subscriptions",  1, 5),
    tx("Amazon Prime",           9, "expense", "Subscriptions",  1, 5),
    tx("YouTube Premium",        8, "expense", "Subscriptions",  1, 5),
    tx("H&M",                   55, "expense", "Shopping",       1, 7),
    tx("Amazon Order",          34, "expense", "Shopping",       1, 14),
    tx("Electric Bill",         55, "expense", "Utilities",      1, 2),
    tx("Water Bill",            22, "expense", "Utilities",      1, 2),
    tx("Broadband",             35, "expense", "Utilities",      1, 2),
    tx("Gym Membership",        25, "expense", "Health",         1, 1),
    tx("Cinema",                13, "expense", "Entertainment",  1, 11),
    tx("Video Games",           35, "expense", "Entertainment",  1, 19),

    # ══ THIS MONTH ════════════════════════════════════════════════
    tx("Student Loan",        1400, "income",  "Salary",         0, 1),
    tx("Part-time Job",        360, "income",  "Salary",         0, 15),
    tx("Rent",                 650, "expense", "Rent",           0, 1),
    tx("Tesco Weekly Shop",     70, "expense", "Food",           0, 3),
    tx("Tesco Weekly Shop",     66, "expense", "Food",           0, 10),
    tx("Deliveroo",             21, "expense", "Food",           0, 8),
    tx("Uber",                  14, "expense", "Transport",      0, 5),
    tx("Bus Pass",              40, "expense", "Transport",      0, 1),
    tx("Netflix",               15, "expense", "Subscriptions",  0, 5),
    tx("Spotify",               10, "expense", "Subscriptions",  0, 5),
    tx("Amazon Prime",           9, "expense", "Subscriptions",  0, 5),
    tx("Electric Bill",         51, "expense", "Utilities",      0, 2),
    tx("Gym Membership",        25, "expense", "Health",         0, 1),
]

# ── Insert transactions ────────────────────────────────────────────
result = db.transactions.insert_many(transactions)
print(f"✅ Inserted {len(result.inserted_ids)} transactions across 4 months")

# ── Budgets (current month) ────────────────────────────────────────
now = datetime.now(timezone.utc)

budgets = [
    {"category": "Food",          "limit": 350.0},
    {"category": "Transport",     "limit": 120.0},
    {"category": "Shopping",      "limit": 100.0},
    {"category": "Subscriptions", "limit":  50.0},
    {"category": "Entertainment", "limit":  80.0},
    {"category": "Utilities",     "limit": 120.0},
    {"category": "Health",        "limit":  60.0},
]

budget_docs = []
for b in budgets:
    # Calculate actual spent this month
    spent = sum(
        t["amount"] for t in transactions
        if t["category"] == b["category"]
        and t["type"] == "expense"
        and t["date"].month == now.month
        and t["date"].year == now.year
    )
    remaining = b["limit"] - spent
    pct = (spent / b["limit"] * 100) if b["limit"] > 0 else 0
    status = "on_track" if pct < 70 else "warning" if pct < 100 else "over_budget"

    budget_docs.append({
        "_id":            ObjectId(),
        "user_id":        user_id,
        "category":       b["category"],
        "limit":          b["limit"],
        "spent":          round(spent, 2),
        "remaining":      round(remaining, 2),
        "percentage_used": round(pct, 1),
        "status":         status,
        "month":          now.month,
        "year":           now.year,
        "created_at":     datetime.now(timezone.utc),
    })

db.budgets.insert_many(budget_docs)
print(f"✅ Inserted {len(budget_docs)} budgets")

# ── Savings goals ──────────────────────────────────────────────────
goals = [
    {
        "_id":          ObjectId(),
        "user_id":      user_id,
        "name":         "Emergency Fund",
        "emoji":        "🛡️",
        "target_amount": 1000.0,
        "saved_amount":  420.0,
        "target_date":  datetime(now.year + 1, 1, 1, tzinfo=timezone.utc),
        "is_completed": False,
        "created_at":   datetime.now(timezone.utc),
    },
    {
        "_id":          ObjectId(),
        "user_id":      user_id,
        "name":         "Laptop Upgrade",
        "emoji":        "💻",
        "target_amount": 800.0,
        "saved_amount":  240.0,
        "target_date":  datetime(now.year, now.month + 4 if now.month <= 8 else now.month - 8,
                                  1, tzinfo=timezone.utc),
        "is_completed": False,
        "created_at":   datetime.now(timezone.utc),
    },
    {
        "_id":          ObjectId(),
        "user_id":      user_id,
        "name":         "Holiday Fund",
        "emoji":        "✈️",
        "target_amount": 600.0,
        "saved_amount":  600.0,
        "target_date":  datetime(now.year, now.month, 1, tzinfo=timezone.utc),
        "is_completed": True,
        "created_at":   datetime.now(timezone.utc),
    },
]

db.goals.insert_many(goals)
print(f"✅ Inserted {len(goals)} savings goals")

print("\n" + "="*50)
print("✅ Seed complete!")
print(f"   Transactions: {len(transactions)}")
print(f"   Budgets:      {len(budget_docs)}")
print(f"   Goals:        {len(goals)}")
print(f"\n   Login with: {TARGET_EMAIL}")
print(f"   Password:   Test1234!")
print("="*50)