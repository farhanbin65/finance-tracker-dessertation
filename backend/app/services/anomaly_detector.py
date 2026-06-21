"""
Anomaly Detection Service
AT2 §3.3.4 — statistical threshold method.
Flags transactions exceeding category mean + 2 standard deviations.
Interpretable, computationally cheap, no training required — ideal for
small per-user datasets (Doshi-Velez & Kim, 2017 favour intrinsic
interpretability over black-box methods at this scale).
"""
import statistics
from datetime import datetime, timezone
from typing import Optional


MIN_SAMPLES_FOR_BASELINE = 4  # need at least this many past txns in a category to trust mean/SD
STD_DEV_THRESHOLD = 2.0       # AT2-specified threshold


def detect_anomalies(transactions: list[dict]) -> list[dict]:
    """
    Takes a user's full transaction list (expenses only matter here).
    Returns a list of anomaly dicts: each flags ONE transaction with
    a human-readable explanation, ready to feed into the alerts service.

    Logic:
    1. Group expense transactions by category.
    2. For each category with enough history, compute mean + stdev
       EXCLUDING the transaction being tested (avoids the anomaly
       inflating its own baseline).
    3. Flag any transaction whose amount > mean + (2 * stdev).
    """
    expenses = [t for t in transactions if t.get("type") == "expense"]

    # group by category
    by_category: dict[str, list[dict]] = {}
    for txn in expenses:
        cat = txn.get("category", "uncategorised")
        by_category.setdefault(cat, []).append(txn)

    anomalies = []

    for category, txns in by_category.items():
        if len(txns) < MIN_SAMPLES_FOR_BASELINE + 1:
            # not enough data to form a reliable baseline for this category
            continue

        amounts = [t["amount"] for t in txns]

        for txn in txns:
            # leave-one-out baseline: exclude the txn under test
            other_amounts = [a for a in amounts if a is not txn["amount"]] or amounts
            # fallback above only protects against identical-value edge case;
            # safer leave-one-out by index:
            idx = txns.index(txn)
            baseline = amounts[:idx] + amounts[idx + 1:]

            if len(baseline) < MIN_SAMPLES_FOR_BASELINE:
                continue

            mean = statistics.mean(baseline)
            stdev = statistics.stdev(baseline) if len(baseline) > 1 else 0

            if stdev == 0:
                continue  # no variance, nothing to flag against

            threshold = mean + (STD_DEV_THRESHOLD * stdev)

            if txn["amount"] > threshold:
                pct_above = round(((txn["amount"] - mean) / mean) * 100) if mean > 0 else 0
                anomalies.append({
                    "transaction_id": txn.get("id"),
                    "category": category,
                    "amount": txn["amount"],
                    "category_average": round(mean, 2),
                    "percent_above_average": pct_above,
                    "explanation": (
                        f"This {category} transaction of £{txn['amount']:.2f} is "
                        f"{pct_above}% higher than your average {category} spend "
                        f"of £{mean:.2f}, flagging it as unusual."
                    ),
                    "date": txn.get("date"),
                    "severity": "high" if txn["amount"] > mean + (3 * stdev) else "medium",
                })

    # most recent / most severe first
    anomalies.sort(key=lambda a: (a["severity"] == "high", a["date"]), reverse=True)
    return anomalies