"""
FinSight — Rate Limiter
Initialised here at module level so it can be imported into any
route file without circular imports. Attached to the Flask app
in create_app() via limiter.init_app(app).

Rate limiting is applied at the route level — login is 
capped at 10 attempts per minute per IP address, 
register at 5. This directly mitigates brute-force attacks, 
aligned to OWASP A07."
"""
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri="memory://",
)