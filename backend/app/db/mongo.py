"""
FinSight — MongoDB Connection Manager
Single connection pool shared across the entire app.
Creates indexes on startup for performance + data integrity.
"""

from pymongo import MongoClient, ASCENDING
from pymongo.database import Database
from app.core.config import config
from app.core.logging import logger


# Module-level client (singleton pattern)
_client: MongoClient = None
_db: Database = None


def get_db() -> Database:
    """
    Return the active MongoDB database instance.
    Initialises connection on first call (lazy init).
    """
    global _client, _db

    if _db is None:
        _client = MongoClient(
            config.MONGO_URI,
            serverSelectionTimeoutMS=5000,  # Fail fast if Mongo is unreachable
            connectTimeoutMS=5000,
        )
        _db = _client[config.MONGO_DB_NAME]
        logger.info("MongoDB connected", extra={"database": config.MONGO_DB_NAME})
        _create_indexes(_db)

    return _db


def _create_indexes(db: Database) -> None:
    """
    Create required indexes on startup.
    - email index: unique constraint, fast lookups
    - transaction indexes: fast date-range queries per user
    """
    try:
        # Users collection — email must be unique
        db.users.create_index(
            [("email", ASCENDING)],
            unique=True,
            name="idx_users_email_unique"
        )

        # Transactions — query by user + date range frequently
        db.transactions.create_index(
            [("user_id", ASCENDING), ("date", ASCENDING)],
            name="idx_transactions_user_date"
        )

        # Goals — query by user
        db.goals.create_index(
            [("user_id", ASCENDING)],
            name="idx_goals_user"
        )

        # Audit log — query by user + timestamp
        db.audit_logs.create_index(
            [("user_id", ASCENDING), ("timestamp", ASCENDING)],
            name="idx_audit_user_timestamp"
        )

        logger.info("MongoDB indexes created successfully")

    except Exception as e:
        logger.error("Failed to create MongoDB indexes", extra={"error": str(e)})


def ping_db() -> bool:
    """Health check — returns True if MongoDB is reachable."""
    try:
        get_db().command("ping")
        return True
    except Exception:
        return False


def close_db() -> None:
    """Gracefully close the MongoDB connection."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
        logger.info("MongoDB connection closed")