"""
FinSight — Multi-User Seed Script
Creates 8 realistic fake users with varied spending patterns.
Useful for testing admin dashboard and demo video.

Usage: python seed_users.py
Run from: backend/
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.mongo import get_db
from app.core.security import hash_password
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import random

db     = get_db()
now    = datetime.now(timezone.utc)

# ── Helper ─────────────────────────────────────────────────────────
def months_ago(n: int, day: int) -> datetime:
    month = now.month - n
    year  = now.year
    while month <= 0:
        month += 12
        year  -= 1
    return datetime(year, month, min(day, 28), tzinfo=timezone.utc)

def make_tx(user_id, title, amount, type_, category, months_back, day):
    return {
        "_id":        ObjectId(),
        "user_id":    user_id,
        "title":      title,
        "amount":     round(amount, 2),
        "type":       type_,
        "category":   category,
        "date":       months_ago(months_back, day),
        "notes":      "",
        "created_at": now,
    }

def make_budget(user_id, category, limit, spent):
    remaining = limit - spent
    pct       = (spent / limit * 100) if limit > 0 else 0
    status    = "on_track" if pct < 70 else "warning" if pct < 100 else "over_budget"
    return {
        "_id":             ObjectId(),
        "user_id":         user_id,
        "category":        category,
        "limit":           round(limit, 2),
        "spent":           round(spent, 2),
        "remaining":       round(remaining, 2),
        "percentage_used": round(pct, 1),
        "status":          status,
        "month":           now.month,
        "year":            now.year,
        "created_at":      now,
    }

def make_goal(user_id, name, emoji, target, saved, months_to_deadline=6):
    deadline = datetime(now.year, now.month + months_to_deadline
                        if now.month + months_to_deadline <= 12
                        else now.month + months_to_deadline - 12,
                        1, tzinfo=timezone.utc)
    return {
        "_id":           ObjectId(),
        "user_id":       user_id,
        "name":          name,
        "emoji":         emoji,
        "target_amount": round(target, 2),
        "saved_amount":  round(saved, 2),
        "target_date":   deadline,
        "is_completed":  saved >= target,
        "created_at":    now,
    }

# ── User profiles ──────────────────────────────────────────────────
USERS = [
    {
        "full_name": "Aisha Rahman",
        "email":     "aisha@finsight.demo",
        "income":    1600,
        "style":     "saver",       # Spends less, saves more
    },
    {
        "full_name": "James Mitchell",
        "email":     "james@finsight.demo",
        "income":    2200,
        "style":     "overspender", # Regularly over budget
    },
    {
        "full_name": "Sofia Patel",
        "email":     "sofia@finsight.demo",
        "income":    1800,
        "style":     "balanced",    # Typical student
    },
    {
        "full_name": "Marcus Thompson",
        "email":     "marcus@finsight.demo",
        "income":    2500,
        "style":     "high_earner", # Higher income, more spending
    },
    {
        "full_name": "Lily Chen",
        "email":     "lily@finsight.demo",
        "income":    1400,
        "style":     "saver",
    },
    {
        "full_name": "Omar Hassan",
        "email":     "omar@finsight.demo",
        "income":    1900,
        "style":     "balanced",
    },
    {
        "full_name": "Emma Wilson",
        "email":     "emma@finsight.demo",
        "income":    2100,
        "style":     "overspender",
    },
    {
        "full_name": "Raj Kapoor",
        "email":     "raj@finsight.demo",
        "income":    2800,
        "style":     "high_earner",
    },
]

# Spending multipliers per style
STYLE_MULT = {
    "saver":       0.6,
    "balanced":    0.8,
    "overspender": 1.1,
    "high_earner": 0.9,
}

# ── Base monthly expenses (will be multiplied by style) ───────────
BASE_EXPENSES = [
    # (title, base_amount, category, day)
    ("Rent",                650, "Rent",           1),
    ("Tesco Weekly Shop",    62, "Food",            3),
    ("Tesco Weekly Shop",    58, "Food",           10),
    ("Tesco Weekly Shop",    65, "Food",           17),
    ("Tesco Weekly Shop",    60, "Food",           24),
    ("Deliveroo",            18, "Food",            8),
    ("Bus Pass",             40, "Transport",       1),
    ("Uber",                 13, "Transport",       6),
    ("Uber",                 11, "Transport",      19),
    ("Netflix",              15, "Subscriptions",   5),
    ("Spotify",              10, "Subscriptions",   5),
    ("Amazon Prime",          9, "Subscriptions",   5),
    ("Electric Bill",        48, "Utilities",       2),
    ("Water Bill",           22, "Utilities",       2),
    ("Gym Membership",       25, "Health",          1),
    ("Shopping",             45, "Shopping",       12),
    ("Entertainment",        30, "Entertainment",  20),
]

# ── Seed each user ─────────────────────────────────────────────────
total_users_created = 0
total_tx_created    = 0

for profile in USERS:
    # Skip if already exists
    existing = db.users.find_one({"email": profile["email"]})
    if existing:
        print(f"⏭️  Skipping {profile['full_name']} — already exists")
        continue

    # Create user
    uid_obj = ObjectId()
    uid_str = str(uid_obj)

    db.users.insert_one({
        "_id":           uid_obj,
        "full_name":     profile["full_name"],
        "email":         profile["email"],
        "password_hash": hash_password("Demo1234!"),
        "role":          "user",
        "currency":      "GBP",
        "is_active":     True,
        "created_at":    now - timedelta(days=random.randint(30, 120)),
    })

    mult = STYLE_MULT[profile["style"]]
    txs  = []

    # 3 months of transactions
    for months_back in range(3, -1, -1):
        # Income
        txs.append(make_tx(uid_str, "Student Loan / Salary",
                            profile["income"], "income", "Salary", months_back, 1))

        # Occasional extra income
        if random.random() > 0.5:
            txs.append(make_tx(uid_str, "Part-time Job",
                                random.randint(200, 500), "income", "Salary",
                                months_back, 15))

        # Expenses — apply style multiplier + random variation
        for title, base_amt, category, day in BASE_EXPENSES:
            variation = random.uniform(0.85, 1.15)
            amount    = round(base_amt * mult * variation, 2)

            # Overspenders sometimes make extra purchases
            if profile["style"] == "overspender" and random.random() > 0.6:
                amount = round(amount * random.uniform(1.2, 1.5), 2)

            txs.append(make_tx(uid_str, title, amount, "expense",
                                category, months_back, day))

        # Random extra transactions for variety
        extras = [
            ("McDonald's",    8,  "Food",          7),
            ("Starbucks",     5,  "Food",          13),
            ("Uber Eats",    16,  "Food",          21),
            ("Train Ticket", 28,  "Transport",     11),
            ("Boots",        14,  "Health",        18),
            ("Cinema",       13,  "Entertainment", 22),
            ("ASOS",         42,  "Shopping",      16),
            ("Steam",        20,  "Entertainment",  9),
        ]
        for ex_title, ex_base, ex_cat, ex_day in random.sample(extras, 3):
            txs.append(make_tx(uid_str, ex_title,
                                round(ex_base * random.uniform(0.9, 1.2), 2),
                                "expense", ex_cat, months_back, ex_day))

    db.transactions.insert_many(txs)

    # Budgets (current month)
    budget_categories = {
        "Food":          round(300 * mult, 0),
        "Transport":     round(120 * mult, 0),
        "Shopping":      round(100 * mult, 0),
        "Subscriptions": round(50  * mult, 0),
        "Entertainment": round(80  * mult, 0),
        "Utilities":     round(120 * mult, 0),
        "Health":        round(60  * mult, 0),
    }

    this_month_txs = [
        t for t in txs
        if t["date"].month == now.month
        and t["date"].year  == now.year
        and t["type"]       == "expense"
    ]

    budgets = []
    for cat, limit in budget_categories.items():
        spent = sum(t["amount"] for t in this_month_txs if t["category"] == cat)
        budgets.append(make_budget(uid_str, cat, limit, spent))

    if budgets:
        db.budgets.insert_many(budgets)

    # Goals
    goal_options = [
        ("Emergency Fund", "🛡️",  1000, random.randint(100, 900)),
        ("New Laptop",     "💻",   800, random.randint(50,  750)),
        ("Holiday",        "✈️",   600, random.randint(200, 600)),
        ("Car Fund",       "🚗",  2000, random.randint(200, 1800)),
        ("Course Fees",    "📚",   500, random.randint(100, 500)),
    ]

    chosen_goals = random.sample(goal_options, random.randint(2, 3))
    goals = [make_goal(uid_str, name, emoji, target, saved)
             for name, emoji, target, saved in chosen_goals]
    db.goals.insert_many(goals)

    print(f"✅ {profile['full_name']:20s} | {len(txs):3d} txns | style: {profile['style']}")
    total_users_created += 1
    total_tx_created    += len(txs)

print(f"""
{'='*50}
✅ Seeding complete!
   Users created:        {total_users_created}
   Transactions created: {total_tx_created}

All demo users password: Demo1234!

Users created:
{''.join(f"  - {u['full_name']:20s} ({u['email']}){chr(10)}" for u in USERS)}
{'='*50}
""")