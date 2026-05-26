"""
FinSight — AI Chat Route
Uses Groq (Llama 3) for fast, free AI responses.
Endpoint: POST /api/chat
"""

from flask import Blueprint, request, jsonify, g
from app.core.config import config
from app.core.logging import logger
from app.core.security import require_auth
from groq import Groq

chat_bp = Blueprint("chat", __name__, url_prefix="/api")

client = Groq(api_key=config.GROQ_API_KEY)

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


@chat_bp.route("/chat", methods=["POST"])
@require_auth
def chat():                           # ✅ NO current_user argument
    """
    POST /api/chat
    User info available via flask.g (set by require_auth decorator)
    """
    # ── Get user from flask.g (set by require_auth) ────
    user_id    = g.current_user_id
    user_email = g.current_user_email

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    messages     = data.get("messages", [])
    user_context = data.get("context", {})

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    # ── Build financial context string ─────────────────
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

    # ── Limit to last 20 messages ──────────────────────
    recent_messages = messages[-20:]

    try:
        logger.info("Chat request", extra={
            "user_id":       user_id,
            "message_count": len(recent_messages),
        })

        response = client.chat.completions.create(
            model=config.GROQ_MODEL,
            messages=[
                {"role": "system", "content": full_system},
                *recent_messages,
            ],
            max_tokens=1024,
            temperature=0.7,
            top_p=0.9,
        )

        reply = response.choices[0].message.content

        logger.info("Chat response sent", extra={
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
        return jsonify({"error": str(e)}), 500  # return real error