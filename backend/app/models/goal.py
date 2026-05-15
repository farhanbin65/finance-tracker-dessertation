"""
FinSight — Savings Goal Pydantic Models
A goal has a target amount, a deadline, and tracks progress over time.
Users can add money to goals incrementally.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone


class GoalCreateRequest(BaseModel):
    """Validated input for POST /api/goals"""
    name: str = Field(..., min_length=1, max_length=100)
    target_amount: float = Field(..., gt=0)
    target_date: datetime
    emoji: Optional[str] = Field(default="🎯", max_length=10)
    notes: Optional[str] = Field(None, max_length=300)

    @field_validator("target_amount")
    @classmethod
    def round_amount(cls, v: float) -> float:
        return round(v, 2)

    @field_validator("name")
    @classmethod
    def sanitise_name(cls, v: str) -> str:
        return v.strip()

    @field_validator("target_date")
    @classmethod
    def target_must_be_future(cls, v: datetime) -> datetime:
        """Target date must be in the future — can't save for the past."""
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        if v <= datetime.now(timezone.utc):
            raise ValueError("Target date must be in the future.")
        return v


class GoalUpdateRequest(BaseModel):
    """Validated input for PUT /api/goals/:id"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    target_amount: Optional[float] = Field(None, gt=0)
    target_date: Optional[datetime] = None
    emoji: Optional[str] = Field(None, max_length=10)
    notes: Optional[str] = Field(None, max_length=300)

    @field_validator("target_amount")
    @classmethod
    def round_amount(cls, v: Optional[float]) -> Optional[float]:
        return round(v, 2) if v is not None else None


class AddMoneyRequest(BaseModel):
    """Validated input for POST /api/goals/:id/deposit"""
    amount: float = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=200)

    @field_validator("amount")
    @classmethod
    def round_amount(cls, v: float) -> float:
        return round(v, 2)