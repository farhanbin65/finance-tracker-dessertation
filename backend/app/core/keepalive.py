"""
Keep-alive service — pings the server every 14 minutes
to prevent Render free tier from sleeping.
Only runs in production.
"""
import threading
import time
import urllib.request
import os

def start_keepalive():
    """Ping self every 14 minutes to prevent Render sleep."""
    url = os.getenv("RENDER_EXTERNAL_URL", "")
    if not url or os.getenv("FLASK_DEBUG") == "true":
        return  # Only run in production

    def ping():
        while True:
            try:
                urllib.request.urlopen(f"{url}/health", timeout=10)
                print(f"Keep-alive ping sent to {url}/health")
            except Exception as e:
                print(f"Keep-alive failed: {e}")
            time.sleep(840)  # 14 minutes

    thread = threading.Thread(target=ping, daemon=True)
    thread.start()