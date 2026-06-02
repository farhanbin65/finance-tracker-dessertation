"""
Run once to create the FinSight admin account.
Usage: python create_admin.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.mongo import get_db
from app.core.security import hash_password
from datetime import datetime, timezone
from bson import ObjectId

db = get_db()

ADMIN_EMAIL    = "admin@finsight.com"
ADMIN_PASSWORD = "Admin1234!"
ADMIN_NAME     = "FinSight Admin"

# Check if already exists
existing = db.users.find_one({"email": ADMIN_EMAIL})
if existing:
    db.users.update_one(
        {"email": ADMIN_EMAIL},
        {"$set": {"role": "admin"}}
    )
    print(f"✅ Updated existing user {ADMIN_EMAIL} to admin role")
else:
    admin_user = {
        "_id":           ObjectId(),
        "full_name":     ADMIN_NAME,
        "email":         ADMIN_EMAIL,
        "password_hash": hash_password(ADMIN_PASSWORD),
        "role":          "admin",
        "currency":      "GBP",
        "created_at":    datetime.now(timezone.utc),
    }
    db.users.insert_one(admin_user)
    print(f"✅ Admin account created: {ADMIN_EMAIL}")

print(f"   Password: {ADMIN_PASSWORD}")
print(f"   Role: admin")
print("Done — login at /login with these credentials")