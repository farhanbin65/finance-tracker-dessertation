"""
FinSight — Alerts API
AT2 §3.3.1 GET /alerts — retrieve active financial alerts.
AT2 §1.2 — "intelligent, proactive financial alerts" covering:
  overspending, anomalies, and savings risks.

This route aggregates signals already computed elsewhere in the system
(budget status, anomaly detection, goal deadlines) rather than duplicating
logic — single source of truth for each underlying calculation.
"""

from datetime import datetime
from flask import Blueprint, jsonify, g

from app.services.transaction_service import get_all_transactions_for_analysis
from app.services.budget_service import get_budgets_with_actuals
from app.services.goal_service import get_goals
from app.services.anomaly_detector import detect_anomalies
from app.core.security import require_auth

alerts_bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")

# A goal counts as "at risk" if less than this many days remain
# and it's still under this percentage saved.
SAVINGS_RISK_DAYS_THRESHOLD = 30
SAVINGS_RISK_PERCENTAGE_THRESHOLD = 70


@alerts_bp.route("", methods=["GET"])
@require_auth
def get_alerts():
    """
    GET /api/alerts
    Aggregates three AT2-specified alert categories into one feed:
      1. Overspending — budgets with status 'over_budget' or 'warning'
      2. Anomalies — unusual transactions (mean + 2 SD)
      3. Savings risk — goals at risk of missing their deadline
    """
    user_id = g.current_user_id
    now = datetime.now()

    alerts = []

    # ── 1. Overspending alerts (from budget status) ──
    budget_data = get_budgets_with_actuals(user_id, now.year, now.month)
    for budget in budget_data["budgets"]:
        if budget["status"] == "over_budget":
            alerts.append({
                "type": "overspending",
                "severity": "high",
                "category": budget["category"],
                "message": (
                    f"You've gone £{budget['spent'] - budget['limit']:.2f} over your "
                    f"{budget['category']} budget this month "
                    f"({budget['percentage_used']:.0f}% used)."
                ),
                "related_id": budget["id"],
            })
        elif budget["status"] == "warning":
            alerts.append({
                "type": "overspending",
                "severity": "medium",
                "category": budget["category"],
                "message": (
                    f"You're at {budget['percentage_used']:.0f}% of your "
                    f"{budget['category']} budget — £{budget['remaining']:.2f} remaining "
                    f"this month."
                ),
                "related_id": budget["id"],
            })

    # ── 2. Anomaly alerts ──
    transactions = get_all_transactions_for_analysis(user_id)
    anomalies = detect_anomalies(transactions)
    for anomaly in anomalies:
        alerts.append({
            "type": "anomaly",
            "severity": anomaly["severity"],
            "category": anomaly["category"],
            "message": anomaly["explanation"],
            "related_id": anomaly["transaction_id"],
        })

    # ── 3. Savings risk alerts ──
    goal_data = get_goals(user_id)
    for goal in goal_data["goals"]:
        if goal["is_completed"]:
            continue
        days_left = goal["days_remaining"]
        progress = goal["percentage"]
        if (
            days_left is not None
            and days_left <= SAVINGS_RISK_DAYS_THRESHOLD
            and progress < SAVINGS_RISK_PERCENTAGE_THRESHOLD
        ):
            alerts.append({
                "type": "savings_risk",
                "severity": "high" if days_left <= 7 else "medium",
                "category": goal["name"],
                "message": (
                    f"Your '{goal['name']}' goal is "
                    f"{progress:.0f}% funded with only {days_left} day"
                    f"{'s' if days_left != 1 else ''} left — "
                    f"£{goal['remaining']:.2f} still needed."
                ),
                "related_id": goal["id"],
            })

    # Sort: high severity first, then by type
    severity_order = {"high": 0, "medium": 1, "low": 2}
    alerts.sort(key=lambda a: severity_order.get(a["severity"], 3))

    return jsonify({
        "alerts": alerts,
        "count": len(alerts),
        "high_severity_count": sum(1 for a in alerts if a["severity"] == "high"),
    }), 200