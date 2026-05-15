"""
FinSight — User Pydantic Models
Pydantic v2 models for validation and serialisation.
These mirror the MongoDB document shape exactly.
"""

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime, timezone
import re


class UserRegisterRequest(BaseModel):
    """Validated input for POST /api/auth/register"""
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        """
        Enforce fintech-grade password requirements:
        - At least 8 characters
        - At least one uppercase letter
        - At least one digit
        - At least one special character
        """
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @field_validator("full_name")
    @classmethod
    def sanitise_name(cls, v: str) -> str:
        """Strip extra whitespace from name."""
        return v.strip()


class UserLoginRequest(BaseModel):
    """Validated input for POST /api/auth/login"""
    email: EmailStr
    password: str = Field(..., min_length=1)


class UserDocument(BaseModel):
    """
    Represents a user document as stored in MongoDB.
    Never expose password_hash in API responses.
    """
    full_name: str
    email: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    mfa_enabled: bool = False
    last_login: Optional[datetime] = None

    # Financial profile defaults
    currency: str = "GBP"
    monthly_income: Optional[float] = None


class UserPublicResponse(BaseModel):
    """
    Safe user object returned in API responses.
    Never contains password_hash or internal fields.
    """
    id: str
    full_name: str
    email: str
    currency: str
    mfa_enabled: bool
    created_at: datetime