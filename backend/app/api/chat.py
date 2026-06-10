"""
FinSight — AI Chat Route
=========================
Integrates fintech-llm-guard PyPI package as the middleware layer
between user messages and the Groq LLM API.

Pipeline (owned by fintech-llm-guard):
  Layer 0a — Provenance tracker    (indirect injection detection)
  Layer 0b — Risk scorer           (message risk assessment)
  Layer 1  — Input sanitiser       (prompt injection detection)
  Layer 2  — Structural separator  (data/instruction separation)
  Layer 3  — PII redactor          (PII detection + pseudonymisation)
  Layer 4a — Output validator      (response safety check)
  Layer 4b — Action allowlist      (action safety)
  Canary   — Context leakage       (system prompt exfiltration)

Research context:
  FinSight is the live proof-of-concept for GSAM 2026 paper:
  "Fintech LLM Guardrails: A Deployable Privacy-Preserving Middleware
  for Intelligent Financial Assistants"

Endpoints:
  POST   /api/chat         — send message, get guardrail-protected reply
  GET    /api/chat/history — load conversation history
  DELETE /api/chat/history — clear conversation history
"""

from flask import Blueprint, request, jsonify, g
from app.core.config import config
from app.core.logging import logger
from app.core.security import require_auth
from app.db.mongo import get_db
from datetime import datetime, timezone

chat_bp = Blueprint("chat", __name__, url_prefix="/api")

# ── Lazy initialisation — only loads on first chat request ────────
# Prevents spacy/guardrail models eating 512MB RAM at startup
_groq_client = None
_pipeline    = None

def get_pipeline():
    """Returns the guardrail pipeline, initialising it on first call."""
    global _groq_client, _pipeline
    if _pipeline is None:
        from fintech_llm_guard import GuardrailPipeline
        from app.services.groq_client import GroqLLMClient
        _groq_client = GroqLLMClient()
        _pipeline    = GuardrailPipeline(llm_client=_groq_client)
    return _pipeline

# Max messages to keep in DB per user
MAX_HISTORY = 100


def _fmt_message(doc: dict) -> dict:
    """Format a MongoDB message document for the API response."""
    return {
        "id":        str(doc["_id"]),
        "role":      doc["role"],
        "content":   doc["content"],
        "timestamp": doc["timestamp"].isoformat()
                     if isinstance(doc.get("timestamp"), datetime) else "",
    }


def _build_transaction_context(user_id: str, db) -> list[dict]:
    """
    Fetch the user's recent transactions from MongoDB and map to the
    format expected by fintech-llm-guard's StructuralSeparator:
      { date, amount, description }

    Mapping:
      title    → description  (pipeline reads 'description')
      amount   → negative for expenses, positive for income
      category → passed as extra field (included in data block)
    """
    transactions = list(
        db.transactions
        .find({"user_id": user_id})
        .sort("date", -1)
        .limit(50)   # last 50 transactions for context
    )

    result = []
    for tx in transactions:
        # Format date as string
        date = tx.get("date", "")
        if isinstance(date, datetime):
            date = date.strftime("%Y-%m-%d")

        # Make expenses negative, income positive
        amount = tx.get("amount", 0)
        if tx.get("type") == "expense":
            amount = -abs(amount)
        else:
            amount = abs(amount)

        result.append({
            "date":        str(date),
            "amount":      round(amount, 2),
            "description": tx.get("title", ""),    # title → description
            "category":    tx.get("category", ""), # extra field — included by pipeline
        })

    return result


# ── GET /api/chat/history ─────────────────────────────────────────

@chat_bp.route("/chat/history", methods=["GET"])
@require_auth
def get_history():
    """
    GET /api/chat/history
    Returns saved conversation history. Frontend calls on page load.
    """
    try:
        db    = get_db()
        limit = int(request.args.get("limit", 50))

        messages = list(
            db.chat_messages
            .find({"user_id": g.current_user_id})
            .sort("timestamp", 1)
            .limit(limit)
        )

        return jsonify({
            "messages": [_fmt_message(m) for m in messages],
            "count":    len(messages),
        }), 200

    except Exception as e:
        logger.error("Get history error", extra={"error": str(e)})
        return jsonify({"error": str(e)}), 500


# ── DELETE /api/chat/history ──────────────────────────────────────

@chat_bp.route("/chat/history", methods=["DELETE"])
@require_auth
def clear_history():
    """
    DELETE /api/chat/history
    Clears the user's conversation history.
    """
    try:
        db     = get_db()
        result = db.chat_messages.delete_many({"user_id": g.current_user_id})

        logger.info("Chat history cleared", extra={
            "user_id": g.current_user_id,
            "deleted": result.deleted_count,
        })

        return jsonify({
            "message": f"Cleared {result.deleted_count} messages",
            "deleted": result.deleted_count,
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST /api/chat ────────────────────────────────────────────────

@chat_bp.route("/chat", methods=["POST"])
@require_auth
def chat():
    """
    POST /api/chat
    Runs user message through the fintech-llm-guard pipeline,
    saves the exchange to MongoDB, returns the safe response.
    """
    user_id = g.current_user_id
    db      = get_db()

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    messages = data.get("messages", [])
    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    # ── Extract latest user message ───────────────────
    latest_user_message = None
    for msg in reversed(messages):
        if msg.get("role") == "user":
            latest_user_message = msg.get("content", "").strip()
            break

    if not latest_user_message:
        return jsonify({"error": "No user message found"}), 400

    # ── Build transaction context for the pipeline ────
    transactions = _build_transaction_context(user_id, db)

    # ── Run through fintech-llm-guard pipeline ────────
    try:
        logger.info("Guardrail pipeline: processing message", extra={
            "user_id":     user_id,
            "tx_count":    len(transactions),
            "msg_preview": latest_user_message[:60],
        })

        result = get_pipeline().process(
            user_message=latest_user_message,
            transactions=transactions,
            session_id=user_id,   # use user_id as session for canary tracking
        )

        # ── Blocked by pipeline ───────────────────────
        if result.blocked:
            logger.warning("Pipeline blocked message", extra={
                "user_id":      user_id,
                "block_layer":  result.block_layer,
                "block_reason": result.block_reason,
            })

            # Save blocked event to audit log
            db.audit_logs.insert_one({
                "event_type":   "GUARDRAIL_BLOCK",
                "user_id":      user_id,
                "timestamp":    datetime.now(timezone.utc),
                "block_layer":  result.block_layer,
                "block_reason": result.block_reason,
                "message":      latest_user_message[:200],
            })

            return jsonify({
                "error":        "Message blocked by security filter",
                "block_layer":  result.block_layer,
                "block_reason": result.block_reason,
                "blocked":      True,
            }), 400

        # ── Safe response — save to MongoDB ───────────
        reply = result.response
        now   = datetime.now(timezone.utc)

        db.chat_messages.insert_many([
            {
                "user_id":   user_id,
                "role":      "user",
                "content":   latest_user_message,
                "timestamp": now,
                "model":     config.GROQ_MODEL,
            },
            {
                "user_id":   user_id,
                "role":      "assistant",
                "content":   reply,
                "timestamp": now,
                "model":     config.GROQ_MODEL,
            },
        ])

        # ── Prune old messages if over limit ──────────
        total_count = db.chat_messages.count_documents({"user_id": user_id})
        if total_count > MAX_HISTORY:
            oldest_to_keep = list(
                db.chat_messages
                .find({"user_id": user_id})
                .sort("timestamp", 1)
                .skip(total_count - MAX_HISTORY)
                .limit(1)
            )
            if oldest_to_keep:
                db.chat_messages.delete_many({
                    "user_id":   user_id,
                    "timestamp": {"$lt": oldest_to_keep[0]["timestamp"]},
                })

        # ── Build audit summary for response ──────────
        audit = result.audit
        pii_redacted = bool(
            result.redaction_result and
            result.redaction_result.entities_found
        )

        logger.info("Guardrail pipeline: message processed safely", extra={
            "user_id":      user_id,
            "pii_redacted": pii_redacted,
            "latency_ms":   audit.latency_ms if audit else None,
        })

        return jsonify({
            "reply":        reply,
            # ── Research metadata (useful for dissertation evidence) ──
            "guardrail": {
                "blocked":      False,
                "pii_redacted": pii_redacted,
                "latency_ms":   audit.latency_ms   if audit else None,
                "risk_score":   audit.risk_score   if audit else None,
                "risk_level":   audit.risk_level   if audit else None,
            },
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error("Chat pipeline error", extra={"error": str(e)})
        return jsonify({"error": str(e)}), 500