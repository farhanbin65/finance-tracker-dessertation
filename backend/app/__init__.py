"""
FinSight — Flask Application Factory
Creates and configures the Flask app.
Factory pattern allows easy testing with different configs.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from app.core.config import config
from app.core.logging import logger
from app.db.mongo import get_db, ping_db



def create_app() -> Flask:
    """
    Application factory — call this to get a configured Flask app.
    Used by main.py for running and by pytest for testing.
    """
    app = Flask(__name__)

    # ── CORS ──────────────────────────────────────────────
    # Only allow requests from our frontend origins
    CORS(app, origins="*", supports_credentials=False)

    # ── Rate Limiting ──────────────────────────────────────
    limiter = Limiter(
        get_remote_address,
        app=app,
        default_limits=[config.RATE_LIMIT_DEFAULT],
        storage_uri="memory://",  # Use Redis in production
    )

    # ── Register Blueprints (Routes) ───────────────────────
    from app.api.auth import auth_bp
    from app.api.transactions import transactions_bp
    from app.api.budgets import budgets_bp
    from app.api.goals import goals_bp
    from app.api.chat import chat_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(budgets_bp)
    app.register_blueprint(goals_bp)
    app.register_blueprint(chat_bp)
    # ── Health Check Endpoint ──────────────────────────────
    @app.route("/health", methods=["GET"])
    def health():
        """
        GET /health
        Used by Docker, CI, and load balancers to verify the app is alive.
        """
        db_ok = ping_db()
        status = "healthy" if db_ok else "degraded"
        http_code = 200 if db_ok else 503

        return jsonify({
            "status": status,
            "app": config.APP_NAME,
            "database": "connected" if db_ok else "unreachable",
        }), http_code

    # ── Global Error Handlers ──────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify({"error": "Too many requests. Please slow down."}), 429

    @app.errorhandler(500)
    def server_error(e):
        logger.error("Unhandled server error", extra={"error": str(e)})
        return jsonify({"error": "Internal server error"}), 500

    logger.info("FinSight app created", extra={"debug": config.DEBUG})
    # ── Keep-alive (production only) ──────────────────────
    from app.core.keepalive import start_keepalive
    start_keepalive()
    return app