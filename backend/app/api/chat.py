"""
FinSight — AI Chat Route
Sends user messages directly to Groq LLM API.
Endpoints:
  POST   /api/chat                — send message, get AI reply
  GET    /api/chat/history        — load conversation history
  DELETE /api/chat/history        — clear conversation history
  DELETE /api/chat/message/<id>   — delete a message pair
"""
from flask import Blueprint, request, jsonify, g
from app.core.config import config
from app.core.logging import logger
from app.core.security import require_auth
from app.db.mongo import get_db
from datetime import datetime, timezone

chat_bp = Blueprint("chat", __name__, url_prefix="/api")

# ── Lazy Groq client ──────────────────────────────────────────────
# NEW — provider switcher
_llm_client = None

def get_llm_client():
    """
    Returns the active LLM client based on LLM_PROVIDER env var.
    groq  → GroqLLMClient  (cloud, used for live deployment)
    ollama → OllamaLLMClient (local, used for dissertation demo)
    Both share the same .chat(messages) -> str interface.
    """
    global _llm_client
    if _llm_client is None:
        from app.core.config import config
        if config.LLM_PROVIDER == "ollama":
            from app.services.ollama_client import OllamaLLMClient
            _llm_client = OllamaLLMClient()
        else:
            from app.services.groq_client import GroqLLMClient
            _llm_client = GroqLLMClient()
    return _llm_client

MAX_HISTORY = 100

def _fmt_message(doc: dict) -> dict:
    return {
        "id":        str(doc["_id"]),
        "role":      doc["role"],
        "content":   doc["content"],
        "timestamp": doc["timestamp"].isoformat()
                     if isinstance(doc.get("timestamp"), datetime) else "",
    }

def _build_transaction_context(user_id: str, db) -> list:
    try:
        from bson import ObjectId
        txns = list(
            db.transactions
            .find({"user_id": user_id})
            .sort("date", -1)
            .limit(50)
        )
        return [
            {
                "date":        str(t.get("date", ""))[:10],
                "amount":      float(t.get("amount", 0)),
                "description": t.get("title", t.get("description", "")),
                "category":    t.get("category", "other"),
                "type":        t.get("type", "expense"),
            }
            for t in txns
        ]
    except Exception:
        return []

# ── POST /api/chat ────────────────────────────────────────────────
@chat_bp.route("/chat", methods=["POST"])
@require_auth
def chat():
    """
    POST /api/chat
    Sends user message to Groq LLM and returns AI reply.
    Saves exchange to MongoDB for persistent history.
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

    # ── Build transaction context ─────────────────────
    transactions = _build_transaction_context(user_id, db)

    # ── Build system prompt ───────────────────────────
    tx_summary = ""
    if transactions:
        tx_summary = "\n".join([
            f"- {t['date']} | {t['description']} | {t['type']} | £{t['amount']:.2f} | {t['category']}"
            for t in transactions[:20]
        ])

    system_prompt = f"""You are FinSight AI, a personal finance assistant.
You have access to the user's recent transactions below.
Be helpful, concise, and specific to their financial situation.
Never ask for passwords, card numbers, or sensitive data.
Keep responses under 200 words unless detail is needed.

Recent transactions:
{tx_summary if tx_summary else 'No transactions available yet.'}
"""

    try:
        # ── Call Groq directly ────────────────────────
        # Build OpenAI-format messages with system prompt first
        groq_messages = [
            {"role": "system", "content": system_prompt},
            *[{"role": m["role"], "content": m["content"]} for m in messages],
        ]
  
        llm = get_llm_client()
        reply = llm.chat(messages=groq_messages)

        # ── Save to MongoDB ───────────────────────────
        now = datetime.now(timezone.utc)
        insert_result = db.chat_messages.insert_many([
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

        user_message_id = str(insert_result.inserted_ids[0])

        # ── Prune old messages ────────────────────────
        total_count = db.chat_messages.count_documents({"user_id": user_id})
        if total_count > MAX_HISTORY:
            oldest = list(
                db.chat_messages
                .find({"user_id": user_id})
                .sort("timestamp", 1)
                .skip(total_count - MAX_HISTORY)
                .limit(1)
            )
            if oldest:
                db.chat_messages.delete_many({
                    "user_id":  user_id,
                    "timestamp": {"$lt": oldest[0]["timestamp"]},
                })

        return jsonify({
            "reply":      reply,
            "message_id": user_message_id,
            "guardrail": {
                "blocked":      False,
                "pii_redacted": False,
                "latency_ms":   None,
                "risk_score":   None,
                "risk_level":   "none",
            },
        }), 200

    except Exception as e:
        logger.error("Chat error", extra={"error": str(e)})
        return jsonify({"error": "AI service unavailable. Please try again."}), 500


# ── GET /api/chat/history ─────────────────────────────────────────
@chat_bp.route("/chat/history", methods=["GET"])
@require_auth
def get_history():
    """GET /api/chat/history — Returns saved conversation history."""
    try:
        db = get_db()
        messages = list(
            db.chat_messages
            .find({"user_id": g.current_user_id})
            .sort("timestamp", 1)
            .limit(MAX_HISTORY)
        )
        return jsonify({
            "messages": [_fmt_message(m) for m in messages],
            "count":    len(messages),
        }), 200
    except Exception as e:
        logger.error("Get history error", extra={"error": str(e)})
        return jsonify({"error": "Could not load history"}), 500


# ── DELETE /api/chat/history ──────────────────────────────────────
@chat_bp.route("/chat/history", methods=["DELETE"])
@require_auth
def clear_history():
    """DELETE /api/chat/history — Clears all chat history for user."""
    try:
        db = get_db()
        result = db.chat_messages.delete_many({"user_id": g.current_user_id})
        return jsonify({
            "message":       "Chat history cleared",
            "deleted_count": result.deleted_count,
        }), 200
    except Exception as e:
        logger.error("Clear history error", extra={"error": str(e)})
        return jsonify({"error": "Could not clear history"}), 500


# ── DELETE /api/chat/message/<message_id> ─────────────────────────
@chat_bp.route("/chat/message/<message_id>", methods=["DELETE"])
@require_auth
def delete_message(message_id):
    """
    DELETE /api/chat/message/:id
    Deletes a user message AND its paired AI response (same timestamp).
    """
    user_id = g.current_user_id
    db      = get_db()
    try:
        from bson import ObjectId
        try:
            obj_id = ObjectId(message_id)
        except Exception:
            return jsonify({"error": "Invalid message ID"}), 400

        message = db.chat_messages.find_one({
            "_id":     obj_id,
            "user_id": user_id,
        })
        if not message:
            return jsonify({"error": "Message not found"}), 404

        # Delete both user + assistant messages at same timestamp
        timestamp = message["timestamp"]
        result = db.chat_messages.delete_many({
            "user_id":   user_id,
            "timestamp": timestamp,
        })

        return jsonify({
            "message":       "Message deleted",
            "deleted_count": result.deleted_count,
        }), 200

    except Exception as e:
        logger.error("Delete message error", extra={"error": str(e)})
        return jsonify({"error": "Could not delete message"}), 500
