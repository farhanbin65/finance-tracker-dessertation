"""
FinSight — AI Chat Route
Uses Groq (Llama 3) for fast, free AI responses.
Persistent memory — conversation history saved to MongoDB.

Endpoints:
  POST /api/chat         — send message + get reply (saves to DB)
  GET  /api/chat/history — load conversation history
  DELETE /api/chat/history — clear conversation history
"""

from flask import Blueprint, request, jsonify, g
from app.core.config import config
from app.core.logging import logger
from app.core.security import require_auth
from app.db.mongo import get_db
from groq import Groq
from datetime import datetime, timezone
from bson import ObjectId

chat_bp = Blueprint("chat", __name__, url_prefix="/api")

client = Groq(api_key=config.GROQ_API_KEY)

# Max messages to keep in DB per user — prevents unbounded growth
MAX_HISTORY = 100

# Max messages to send to Groq per request — keeps cost low
CONTEXT_WINDOW = 20

SYSTEM_PROMPT = """You are FinSight AI, a smart and friendly personal finance assistant.

Your personality:
- Warm, encouraging, and professional
- Speak like a knowledgeable friend, not a robot
- Use British English and £ for currency
- Keep responses concise — 2-4 sentences unless asked for detail
- Use emojis sparingly but effectively

Your capabilities:
- Analyse spending patterns and give insights
- Help users manage budgets and set financial goals
- Give practical savings advice and money tips
- Explain financial concepts in simple terms
- Flag unusual or concerning spending patterns

Your rules:
- NEVER give specific investment advice or stock tips
- NEVER ask for sensitive data like card numbers or passwords
- Always clarify you are an AI, not a regulated financial advisor
- Keep all advice relevant to personal finance
- Be encouraging — personal finance is stressful

When given the user's financial context, use it for personalised advice."""


def _fmt_message(doc: dict) -> dict:
    """Format a MongoDB message document for the API response."""
    return {
        "id":        str(doc["_id"]),
        "role":      doc["role"],
        "content":   doc["content"],
        "timestamp": doc["timestamp"].isoformat() if isinstance(doc.get("timestamp"), datetime) else "",
    }


@chat_bp.route("/chat/history", methods=["GET"])
@require_auth
def get_history():
    """
    GET /api/chat/history
    Returns the user's saved conversation history.
    Frontend calls this on page load to restore the chat.
    """
    try:
        db = get_db()
        limit = int(request.args.get("limit", 50))

        messages = list(
            db.chat_messages
            .find({"user_id": g.current_user_id})
            .sort("timestamp", 1)   # oldest first
            .limit(limit)
        )

        return jsonify({
            "messages": [_fmt_message(m) for m in messages],
            "count":    len(messages),
        }), 200

    except Exception as e:
        logger.error("Get history error", extra={"error": str(e)})
        return jsonify({"error": str(e)}), 500


@chat_bp.route("/chat/history", methods=["DELETE"])
@require_auth
def clear_history():
    """
    DELETE /api/chat/history
    Clears the user's entire conversation history.
    Called when user clicks the clear chat button.
    """
    try:
        db = get_db()
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


@chat_bp.route("/chat", methods=["POST"])
@require_auth
def chat():
    """
    POST /api/chat
    Sends a message, gets AI reply, saves both to MongoDB.
    """
    user_id = g.current_user_id
    db      = get_db()

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    messages     = data.get("messages", [])
    user_context = data.get("context", {})

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    # ── Get the latest user message ───────────────────
    latest_user_message = None
    for msg in reversed(messages):
        if msg.get("role") == "user":
            latest_user_message = msg.get("content", "")
            break

    if not latest_user_message:
        return jsonify({"error": "No user message found"}), 400

    # ── Build financial context string ────────────────
    context_str = ""
    if user_context:
        context_str = f"""
Current user financial snapshot:
- Monthly budget:    £{user_context.get('total_budget', 'N/A')}
- Spent this month:  £{user_context.get('total_spent', 'N/A')}
- Remaining budget:  £{user_context.get('remaining', 'N/A')}
- Top spending area: {user_context.get('top_category', 'N/A')}
- Active goals:      {user_context.get('goals_count', 0)}
- Total saved:       £{user_context.get('total_saved', 0)}
"""

    full_system = SYSTEM_PROMPT
    if context_str:
        full_system += f"\n\n{context_str}"

    # ── Load conversation history from MongoDB ────────
    # This is the persistent memory — we combine DB history
    # with whatever the frontend sent, deduplicated
    db_history = list(
        db.chat_messages
        .find({"user_id": user_id})
        .sort("timestamp", 1)
        .limit(MAX_HISTORY)
    )

    # Build Groq context from DB history (last CONTEXT_WINDOW messages)
    history_for_groq = [
        {"role": msg["role"], "content": msg["content"]}
        for msg in db_history[-CONTEXT_WINDOW:]
        if msg["role"] in ("user", "assistant")
    ]

    # Add the new user message if not already in history
    # (avoid duplication if frontend also sends history)
    last_db_content = db_history[-1]["content"] if db_history else ""
    if latest_user_message != last_db_content:
        history_for_groq.append({
            "role":    "user",
            "content": latest_user_message,
        })

    try:
        logger.info("Chat request", extra={
            "user_id":       user_id,
            "message_count": len(history_for_groq),
        })

        response = client.chat.completions.create(
            model=config.GROQ_MODEL,
            messages=[
                {"role": "system", "content": full_system},
                *history_for_groq,
            ],
            max_tokens=1024,
            temperature=0.7,
            top_p=0.9,
        )

        reply = response.choices[0].message.content

        # ── Save user message + AI reply to MongoDB ───
        now = datetime.now(timezone.utc)

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
        # Keeps MongoDB clean — only keep last MAX_HISTORY messages
        total_count = db.chat_messages.count_documents({"user_id": user_id})
        if total_count > MAX_HISTORY:
            # Find the ID of the message at position (total - MAX_HISTORY)
            oldest_to_keep = list(
                db.chat_messages
                .find({"user_id": user_id})
                .sort("timestamp", 1)
                .skip(total_count - MAX_HISTORY)
                .limit(1)
            )
            if oldest_to_keep:
                db.chat_messages.delete_many({
                    "user_id":  user_id,
                    "timestamp": {"$lt": oldest_to_keep[0]["timestamp"]}
                })

        logger.info("Chat response saved", extra={
            "user_id":       user_id,
            "input_tokens":  response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
        })

        return jsonify({
            "reply": reply,
            "usage": {
                "input_tokens":  response.usage.prompt_tokens,
                "output_tokens": response.usage.completion_tokens,
            }
        })

    except Exception as e:
        print(f"GROQ ERROR DETAILS: {type(e).__name__}: {e}")
        logger.error("Groq API error", extra={"error": str(e)})
        return jsonify({"error": str(e)}), 500