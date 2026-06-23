"""
One-time migration: encrypt existing plaintext email + full_name fields.
Run once from backend/ directory:
    python migrate_encrypt_users.py
Safe to re-run — decrypt_field() detects already-encrypted docs.
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from app.db.mongo import get_db
from app.core.encryption import encrypt_field, decrypt_field, hash_email_for_lookup

def migrate():
    db = get_db()
    users = list(db.users.find({}))
    print(f"Found {len(users)} users to migrate.")

    for user in users:
        email     = user.get("email", "")
        full_name = user.get("full_name", "")

        # decrypt_field returns plaintext unchanged if not yet encrypted
        plain_email = decrypt_field(email)
        plain_name  = decrypt_field(full_name)

        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "email":      encrypt_field(plain_email),
                "full_name":  encrypt_field(plain_name),
                "email_hash": hash_email_for_lookup(plain_email),
            }}
        )
        print(f"  Migrated: {plain_email}")

    print("Migration complete.")

if __name__ == "__main__":
    migrate()