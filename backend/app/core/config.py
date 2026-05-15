"""
FinSight — Central Configuration
Loads all environment variables with safe defaults.
Never hardcode secrets — always read from .env
"""

import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # ── App ────────────────────────────────────────────────
    APP_NAME: str = "FinSight"
    DEBUG: bool = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    TESTING: bool = False

    # ── MongoDB ────────────────────────────────────────────
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "finsight_db")

    # ── JWT ────────────────────────────────────────────────
    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-this-in-production")
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRY_HOURS: int = int(os.getenv("JWT_ACCESS_EXPIRY_HOURS", "1"))
    JWT_REFRESH_EXPIRY_DAYS: int = int(os.getenv("JWT_REFRESH_EXPIRY_DAYS", "7"))

    # ── Security ───────────────────────────────────────────
    BCRYPT_ROUNDS: int = 12  # High cost factor for fintech-grade password hashing
    ALLOWED_ORIGINS: list = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:3000"
    ).split(",")

    # ── Rate Limiting ──────────────────────────────────────
    RATE_LIMIT_DEFAULT: str = "100 per hour"
    RATE_LIMIT_AUTH: str = "10 per minute"  # Stricter for login/register

    # ── Groq AI (chatbot) ──────────────────────────────────
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = "llama3-8b-8192"

config = Config()