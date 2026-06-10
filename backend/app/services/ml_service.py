"""
FinSight — ML Service
Spending predictor with SHAP explainability.

Architecture:
  1. Feature engineering from user's transaction history
  2. Random Forest regression (scikit-learn)
  3. SHAP TreeExplainer for feature attribution
  4. Natural language explanation via Groq

Dissertation value:
  - Explainable AI (XAI) using SHAP (Lundberg & Lee, 2017)
  - Privacy-preserving: model trained on user's own data only
  - Hybrid AI: ML prediction + LLM explanation
"""
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

logger = logging.getLogger("finsight")

# ── Categories ────────────────────────────────────────────────────
CATEGORIES = [
    "Food", "Transport", "Shopping", "Rent",
    "Subscriptions", "Entertainment", "Utilities",
    "Health", "Other"
]

# ── Feature Engineering ───────────────────────────────────────────

def build_feature_matrix(transactions: list):
    """
    Convert raw transactions into ML feature matrix.
    Features per month:
      - Spending per category (9 features)
      - Total spending
      - Transaction count
      - Month number (seasonality)
      - Day-of-week distribution
    Returns DataFrame with shape (n_months, n_features)
    or None if insufficient data.
    """
    import numpy as np  # lazy — only loads when insights route is called
    import pandas as pd
    if not transactions:
        return None

    # Build monthly aggregates
    monthly = {}
    for tx in transactions:
        if tx.get("type") != "expense":
            continue
        try:
            date = tx.get("date")
            if isinstance(date, str):
                date = datetime.fromisoformat(date.replace("Z", "+00:00"))
            key = f"{date.year}-{date.month:02d}"
            cat = tx.get("category", "Other")
            if cat not in CATEGORIES:
                cat = "Other"
            if key not in monthly:
                monthly[key] = {c: 0.0 for c in CATEGORIES}
                monthly[key]["_total"] = 0.0
                monthly[key]["_count"] = 0
                monthly[key]["_month_num"] = date.month
            monthly[key][cat]    += float(tx.get("amount", 0))
            monthly[key]["_total"] += float(tx.get("amount", 0))
            monthly[key]["_count"] += 1
        except Exception:
            continue

    if len(monthly) < 2:
        return None  # Need at least 2 months

    df = pd.DataFrame.from_dict(monthly, orient="index")
    df.index = pd.to_datetime(df.index)
    df = df.sort_index()

    # Add rolling 3-month average for each category
    for cat in CATEGORIES:
        df[f"{cat}_roll3"] = df[cat].rolling(3, min_periods=1).mean()

    return df


def train_and_predict(df):
    """
    Train Random Forest on historical data and predict next month.
    Returns predictions + SHAP values.
    """
    import numpy as np  # lazy
    import pandas as pd
    from sklearn.ensemble import RandomForestRegressor
    import shap

    feature_cols = (
        CATEGORIES +
        ["_total", "_count", "_month_num"] +
        [f"{c}_roll3" for c in CATEGORIES]
    )

    # Prepare X (features) and y (target = next month total)
    X = df[feature_cols].values[:-1]   # all months except last
    y = df["_total"].values[1:]        # next month's total (shifted by 1)

    if len(X) < 2:
        return _fallback_prediction(df)

    # Train model
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=4,           # Keep shallow — avoids overfitting on small data
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X, y)

    # Predict next month using latest data as input
    X_latest = df[feature_cols].values[-1:] # most recent month
    prediction = float(model.predict(X_latest)[0])
    prediction = max(0, prediction)  # No negative spending

    # ── SHAP explainability ──
    explainer   = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_latest)

    # Map SHAP values back to feature names
    feature_names = feature_cols
    shap_dict     = {
        name: float(val)
        for name, val in zip(feature_names, shap_values[0])
    }

    # Extract category-level SHAP values (most interpretable)
    category_shap = {
        cat: round(shap_dict.get(cat, 0.0), 2)
        for cat in CATEGORIES
    }

    # Top 3 drivers (highest absolute SHAP values)
    top_drivers = sorted(
        category_shap.items(),
        key=lambda x: abs(x[1]),
        reverse=True
    )[:3]

    # Current month actuals for comparison
    latest = df.iloc[-1]
    current_by_category = {
        cat: round(float(latest.get(cat, 0)), 2)
        for cat in CATEGORIES
        if float(latest.get(cat, 0)) > 0
    }

    # Confidence — based on training data size
    confidence = min(95, 60 + (len(df) * 5))

    return {
        "predicted_total":     round(prediction, 2),
        "confidence":          confidence,
        "category_shap":       category_shap,
        "top_drivers":         [
            {
                "category":    cat,
                "shap_value":  val,
                "direction":   "increases" if val > 0 else "decreases",
                "current_spend": current_by_category.get(cat, 0),
            }
            for cat, val in top_drivers
        ],
        "current_by_category": current_by_category,
        "months_of_data":      len(df),
        "model_type":          "RandomForestRegressor",
    }


def _fallback_prediction(df) -> dict:
    import numpy as np
    import pandas as pd
    """
    Simple moving average fallback when insufficient data for ML.
    Used when user has < 2 months of data.
    """
    avg = float(df["_total"].mean()) if len(df) > 0 else 0
    latest = df.iloc[-1] if len(df) > 0 else {}

    current_by_category = {
        cat: round(float(latest.get(cat, 0)), 2)
        for cat in CATEGORIES
        if float(latest.get(cat, 0)) > 0
    }

    return {
        "predicted_total":     round(avg, 2),
        "confidence":          40,
        "category_shap":       {cat: 0.0 for cat in CATEGORIES},
        "top_drivers":         [],
        "current_by_category": current_by_category,
        "months_of_data":      len(df),
        "model_type":          "MovingAverage (fallback)",
        "fallback":            True,
    }


def get_budget_risk(predicted: float, budgets: list) -> str:
    """
    Compare prediction against total budget limits.
    Returns: on_track | warning | at_risk
    """
    total_budget = sum(b.get("limit", 0) for b in budgets)
    if total_budget == 0:
        return "unknown"
    ratio = predicted / total_budget
    if ratio < 0.8:
        return "on_track"
    elif ratio < 1.0:
        return "warning"
    return "at_risk"


def generate_nl_explanation(
    prediction: dict,
    groq_api_key: str,
    groq_model: str,
    currency: str = "GBP"
) -> str:
    """
    Generate natural language explanation of SHAP values using Groq.
    Falls back to rule-based explanation if Groq unavailable.
    """
    symbol = "£" if currency == "GBP" else "$"

    # Build context from SHAP data
    drivers = prediction.get("top_drivers", [])
    if not drivers:
        return _rule_based_explanation(prediction, symbol)

    driver_text = ", ".join([
        f"{d['category']} ({'+' if d['shap_value'] > 0 else ''}{d['shap_value']:.0f})"
        for d in drivers
    ])

    prompt = f"""You are a personal finance AI assistant. 
Explain this spending prediction in exactly 2 clear sentences.
Be specific, helpful and encouraging. Use {symbol} for currency.

Predicted next month spending: {symbol}{prediction['predicted_total']:.0f}
Top spending drivers (SHAP values show their impact): {driver_text}
Data confidence: {prediction['confidence']}%

Write 2 sentences only. First sentence: what will drive spending.
Second sentence: one actionable tip."""

    try:
        from groq import Groq
        client   = Groq(api_key=groq_api_key)
        response = client.chat.completions.create(
            model=groq_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=120,
            temperature=0.4,
        )
        return response.choices[0].message.content.strip()
    except Exception:
        return _rule_based_explanation(prediction, symbol)


def _rule_based_explanation(prediction: dict, symbol: str) -> str:
    """Fallback explanation without LLM."""
    total    = prediction.get("predicted_total", 0)
    drivers  = prediction.get("top_drivers", [])
    top      = drivers[0]["category"] if drivers else "general spending"
    conf     = prediction.get("confidence", 0)

    return (
        f"Based on your spending patterns, you are predicted to spend "
        f"{symbol}{total:.0f} next month, with {top} being your biggest driver. "
        f"Consider reviewing your {top} budget to stay on track "
        f"(prediction confidence: {conf}%)."
    )