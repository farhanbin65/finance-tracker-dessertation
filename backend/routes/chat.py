from flask import Blueprint, request, jsonify
from middleware.auth import require_auth
import anthropic
import os

chat_bp = Blueprint('chat', __name__)
client  = anthropic.Anthropic(api_key=os.environ.get('ANTHROPIC_API_KEY'))

# ── System prompt — FinSight AI persona ──────────────────
SYSTEM_PROMPT = """You are FinSight AI, a smart and friendly personal finance assistant built into the FinSight app.

Your personality:
- Warm, encouraging, and professional
- You speak like a knowledgeable friend, not a robot
- Use British English (£ for currency, British spellings)
- Keep responses concise — 2-4 sentences max unless asked for detail
- Use emojis sparingly but effectively

Your capabilities:
- Analyse spending patterns and give insights
- Help set and manage budgets
- Give savings advice and tips
- Explain financial concepts simply
- Detect unusual spending and flag it
- Suggest ways to save money

Your rules:
- NEVER give specific investment advice or stock tips
- NEVER ask for or store sensitive data like card numbers or passwords
- Always remind users you are an AI for general guidance, not a regulated financial advisor
- If asked about illegal activity, politely decline
- Keep all advice relevant to personal finance

When you receive user financial context, use it to give personalised advice.
Always be encouraging — personal finance is stressful and users need support."""


@chat_bp.route('/api/chat', methods=['POST'])
@require_auth
def chat(current_user):
    data = request.get_json()

    messages     = data.get('messages', [])
    user_context = data.get('context', {})

    if not messages:
        return jsonify({'error': 'No messages provided'}), 400

    # Build context string from user's financial data
    context_str = ''
    if user_context:
        context_str = f"""
Current user financial context:
- Monthly budget: £{user_context.get('total_budget', 'unknown')}
- Spent this month: £{user_context.get('total_spent', 'unknown')}
- Budget remaining: £{user_context.get('remaining', 'unknown')}
- Top spending category: {user_context.get('top_category', 'unknown')}
- Savings goals: {user_context.get('goals_count', 0)} active goals
- Total saved: £{user_context.get('total_saved', 0)}
"""

    # Inject context into system prompt
    full_system = SYSTEM_PROMPT
    if context_str:
        full_system += f"\n\n{context_str}"

    try:
        response = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=1024,
            system=full_system,
            messages=messages  # Full conversation history from frontend
        )

        reply = response.content[0].text

        return jsonify({
            'reply': reply,
            'usage': {
                'input_tokens':  response.usage.input_tokens,
                'output_tokens': response.usage.output_tokens,
            }
        })

    except anthropic.APIError as e:
        return jsonify({'error': f'AI service error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': 'Something went wrong'}), 500