"""
FinSight — Budget Pydantic Models
A budget is a monthly spending limit per category.
Users set a limit, we track actual spending against it.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone
from app.models.transaction import TransactionCategory


class BudgetCreateRequest(BaseModel):
    """Validated input for POST /api/budgets"""
    category: TransactionCategory
    limit: float = Field(..., gt=0, description="Monthly spending limit in GBP")
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)
    alert_threshold: float = Field(
        default=80.0,
        ge=1,
        le=100,
        description="Percentage at which to trigger a warning alert (default 80%)"
    )

    @field_validator("limit")
    @classmethod
    def round_limit(cls, v: float) -> float:
        return round(v, 2)


class BudgetUpdateRequest(BaseModel):
    """Validated input for PUT /api/budgets/:id"""
    limit: Optional[float] = Field(None, gt=0)
    alert_threshold: Optional[float] = Field(None, ge=1, le=100)

    @field_validator("limit")
    @classmethod
    def round_limit(cls, v: Optional[float]) -> Optional[float]:
        return round(v, 2) if v is not None else None