"""
FinSight — Insights API
ML-powered spending predictions with SHAP explainability.

Routes:
  POST /api/insights/predict  — run ML prediction + SHAP
  GET  /api/insights/summary  — quick spending summary (no ML)
"""

from flask import Blueprint, jsonify, g
from app.core.security import require_auth
from app.db.mongo import get_db
from app.core.config import config
from app.services.transaction_service import get_all_transactions_for_analysis
from app.services.anomaly_detector import detect_anomalies

insights_bp = Blueprint("insights", __name__, url_prefix="/api/insights")


@insights_bp.route("/predict", methods=["POST"])
@require_auth
def predict_spending():
    """
    Run ML spending prediction with SHAP explainability.

    Returns:
      - predicted_total: next month's predicted spend
      - confidence: model confidence %
      - top_drivers: SHAP-ranked spending categories
      - category_shap: SHAP value per category
      - nl_explanation: natural language explanation
      - budget_risk: on_track | warning | at_risk
      - current_by_category: this month's actuals

    Dissertation value:
      Demonstrates XAI — transparent, user-interpretable ML.
      Aligns with EU AI Act transparency requirements.
    """
    try:
        from app.services.ml_service import (
            build_feature_matrix,
            train_and_predict,
            get_budget_risk,
            generate_nl_explanation,
        )

        db     = get_db()
        uid    = g.current_user_id
        # Fetch user's full transaction history — excludes soft-deleted records
        transactions = get_all_transactions_for_analysis(uid)
        if not transactions:
            return jsonify({
                "error":   "insufficient_data",
                "message": "Add at least 2 months of transactions to enable predictions.",
                "min_transactions": 10,
                "current_count":    0,
            }), 200  # 200 not 400 — frontend handles gracefully

        # Fetch budgets for risk assessment
        budgets = list(db.budgets.find({"user_id": uid}))

        # Fetch user currency
        user     = db.users.find_one({"_id": __import__("bson").ObjectId(uid)})
        currency = user.get("currency", "GBP") if user else "GBP"

        # ── ML Pipeline ──
        df = build_feature_matrix(transactions)

        if df is None:
            return jsonify({
                "error":   "insufficient_data",
                "message": "Add transactions across at least 2 months to enable predictions.",
                "current_count": len(transactions),
            }), 200

        # Train model + get SHAP values
        prediction = train_and_predict(df)

        # Budget risk assessment
        prediction["budget_risk"] = get_budget_risk(
            prediction["predicted_total"], budgets
        )

        # Natural language explanation (Groq + SHAP context)
        prediction["nl_explanation"] = generate_nl_explanation(
            prediction,
            config.GROQ_API_KEY,
            config.GROQ_MODEL,
            currency,
        )

        prediction["currency"] = currency

        # AT2 Diagram 5: anomaly check happens alongside the forecast
        anomalies = detect_anomalies(transactions)
        prediction["anomaly_count"] = len(anomalies)
        prediction["anomalies"] = anomalies[:5]  # cap payload — most severe first

        return jsonify(prediction), 200

    except ImportError as e:
        # SHAP or sklearn not installed
        return jsonify({
            "error":   "ml_unavailable",
            "message": f"ML dependencies not installed: {str(e)}",
        }), 503

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@insights_bp.route("/summary", methods=["GET"])
@require_auth
def get_summary():
    """
    Quick spending summary without ML.
    Used as fallback when insufficient data for prediction.
    """
    try:
        from datetime import datetime, timezone
        db  = get_db()
        uid = g.current_user_id
        now = datetime.now(timezone.utc)

        # This month's transactions
        transactions = list(db.transactions.find({
            "user_id": uid,
            "date": {
                "$gte": datetime(now.year, now.month, 1, tzinfo=timezone.utc)
            }
        }))

        total_income   = sum(t["amount"] for t in transactions if t.get("type") == "income")
        total_expenses = sum(t["amount"] for t in transactions if t.get("type") == "expense")

        by_category = {}
        for t in transactions:
            if t.get("type") == "expense":
                cat = t.get("category", "Other")
                by_category[cat] = by_category.get(cat, 0) + t["amount"]

        return jsonify({
            "total_income":    round(total_income, 2),
            "total_expenses":  round(total_expenses, 2),
            "net":             round(total_income - total_expenses, 2),
            "by_category":     {k: round(v, 2) for k, v in by_category.items()},
            "tx_count":        len(transactions),
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500