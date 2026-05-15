"""
FinSight — Transaction Pydantic Models
Defines the shape of transaction data for validation and serialisation.
Categories are fixed enum values — keeps data clean for ML later.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone
from enum import Enum


class TransactionType(str, Enum):
    """Every transaction is either money in or money out."""
    INCOME = "income"
    EXPENSE = "expense"


class TransactionCategory(str, Enum):
    """
    Fixed category list — critical for ML feature engineering.
    Adding random categories would break the forecasting model.
    """
    # Expense categories
    FOOD = "Food"
    TRANSPORT = "Transport"
    SHOPPING = "Shopping"
    ENTERTAINMENT = "Entertainment"
    SUBSCRIPTIONS = "Subscriptions"
    HEALTH = "Health"
    UTILITIES = "Utilities"
    RENT = "Rent"
    EDUCATION = "Education"
    TRAVEL = "Travel"
    OTHER = "Other"

    # Income categories
    SALARY = "Salary"
    FREELANCE = "Freelance"
    INVESTMENT = "Investment"
    GIFT = "Gift"


class TransactionCreateRequest(BaseModel):
    """Validated input for POST /api/transactions"""
    title: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0)  # Must be positive — type determines direction
    type: TransactionType
    category: TransactionCategory
    date: Optional[datetime] = None  # Defaults to now if not provided
    notes: Optional[str] = Field(None, max_length=300)

    @field_validator("amount")
    @classmethod
    def round_amount(cls, v: float) -> float:
        """Round to 2 decimal places — financial data must be precise."""
        return round(v, 2)

    @field_validator("title")
    @classmethod
    def sanitise_title(cls, v: str) -> str:
        return v.strip()


class TransactionUpdateRequest(BaseModel):
    """Validated input for PUT /api/transactions/:id — all fields optional."""
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    amount: Optional[float] = Field(None, gt=0)
    type: Optional[TransactionType] = None
    category: Optional[TransactionCategory] = None
    date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=300)

    @field_validator("amount")
    @classmethod
    def round_amount(cls, v: Optional[float]) -> Optional[float]:
        return round(v, 2) if v is not None else None


class TransactionFilters(BaseModel):
    """Query parameters for GET /api/transactions"""
    type: Optional[TransactionType] = None
    category: Optional[TransactionCategory] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)