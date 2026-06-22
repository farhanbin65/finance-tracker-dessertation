"""
FinSight — Ollama LLM Client Wrapper
=====================================
Mirrors the GroqLLMClient interface exactly so chat.py
can swap between Groq (cloud) and Ollama (local) via a
single environment variable — LLM_PROVIDER=ollama|groq.

AT2 §1.1 — locally hosted LLM, no financial data transmitted
to third-party cloud services.
"""
import json
import urllib.request
from app.core.config import config


class OllamaLLMClient:
    """
    Adapter between FinSight chat pipeline and Ollama's local REST API.
    Matches GroqLLMClient's interface exactly:
        client.chat(messages: list[dict]) -> str
    """

    def __init__(self):
        self._base_url = config.OLLAMA_BASE_URL   # default: http://localhost:11434
        self._model    = config.OLLAMA_MODEL       # default: llama3.1

    def chat(self, messages: list[dict]) -> str:
        """
        Calls Ollama's /api/chat endpoint with OpenAI-format messages.
        Returns the assistant reply as a plain string.
        Raises RuntimeError if Ollama is unreachable.
        """
        payload = json.dumps({
            "model":    self._model,
            "messages": messages,
            "stream":   False,
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{self._base_url}/api/chat",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["message"]["content"].strip()
        except urllib.error.URLError as e:
            raise RuntimeError(
                f"Ollama is not reachable at {self._base_url}. "
                f"Make sure Ollama is running: ollama serve. Error: {e}"
            )