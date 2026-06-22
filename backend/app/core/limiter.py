"""
FinSight — Rate Limiter
Initialised here at module level so it can be imported into any
route file without circular imports. Attached to the Flask app
in create_app() via limiter.init_app(app).
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",  # swap to Redis URI in production
)