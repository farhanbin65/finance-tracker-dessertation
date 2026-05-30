"""
FinSight — Goal Seeder (Windows UTF-8 fix)
Fixes emoji encoding issue by using Python requests instead of curl.
Run: python seed_goals.py (with backend running on port 5000)
"""

import io
import sys

# Force UTF-8 stdout on Windows — fixes emoji printing
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import requests

BASE = "http://127.0.0.1:5000"

# ── Login ──────────────────────────────────────────────
login = requests.post(f"{BASE}/api/auth/login", json={
    "email": "test@finsght.com",
    "password": "Test1234!"
})
token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"Logged in successfully")

# ── Delete ALL existing goals ──────────────────────────
goals_res = requests.get(f"{BASE}/api/goals", headers=headers).json()
for goal in goals_res.get("goals", []):
    requests.delete(f"{BASE}/api/goals/{goal['id']}", headers=headers)
    print(f"Deleted: {goal['name']} {goal['emoji']}")

print("\nAll old goals cleared.")

# ── Create fresh goals with correct emojis ─────────────
goals_data = [
    {
        "name": "House Deposit",
        "target_amount": 20000,
        "target_date": "2026-12-01T00:00:00Z",
        "emoji": "🏠",
        "notes": "Saving for first home"
    },
    {
        "name": "Holiday Fund",
        "target_amount": 2000,
        "target_date": "2026-08-01T00:00:00Z",
        "emoji": "✈️",
        "notes": "Summer holiday"
    },
    {
        "name": "New Car",
        "target_amount": 15000,
        "target_date": "2027-03-01T00:00:00Z",
        "emoji": "🚗",
        "notes": "Upgrade the car"
    },
]

created_goals = []
for goal in goals_data:
    res = requests.post(f"{BASE}/api/goals", headers=headers, json=goal)
    data = res.json()
    created_goals.append(data)
    print(f"Created: {data.get('name')} {data.get('emoji')} — status {res.status_code}")

print("\nAdding deposits...")

# ── Add realistic deposits ─────────────────────────────
deposits = {
    "House Deposit": 15000,
    "Holiday Fund":  800,
    "New Car":       1500,
}

for goal in created_goals:
    amount = deposits.get(goal.get("name"))
    if amount:
        res = requests.post(
            f"{BASE}/api/goals/{goal['id']}/deposit",
            headers=headers,
            json={"amount": amount, "notes": "Initial savings"}
        )
        print(f"Deposited £{amount} into {goal.get('name')} — status {res.status_code}")

# ── Verify final state ─────────────────────────────────
print("\nFinal goals:")
final = requests.get(f"{BASE}/api/goals", headers=headers).json()
for g in final.get("goals", []):
    print(f"  {g['emoji']} {g['name']} — £{g['saved_amount']} / £{g['target_amount']} ({g['percentage']}%)")

print("\nSeeding complete!")