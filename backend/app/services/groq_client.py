"""
FinSight — Groq LLM Client Wrapper
====================================
Thin adapter that makes the Groq client compatible with
fintech-llm-guard's GuardrailPipeline interface.

The pipeline calls self.llm.chat(messages) where messages is
a list of OpenAI-compatible dicts:
  [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]

This wrapper translates that call to the Groq SDK.
"""

from app.core.config import config
from groq import Groq


class GroqLLMClient:
    """
    Adapter between fintech-llm-guard's pipeline and the Groq SDK.

    The pipeline expects:
        client.chat(messages: list[dict]) -> str

    The Groq SDK expects:
        client.chat.completions.create(model, messages, ...) -> ChatCompletion
    """

    def __init__(self):
        self._client = Groq(api_key=config.GROQ_API_KEY)
        self._model  = config.GROQ_MODEL

    def chat(self, messages: list[dict]) -> str:
        """
        Called by GuardrailPipeline internally during pipeline.process().
        Takes OpenAI-format messages, returns the assistant reply as a string.
        """
        response = self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            max_tokens=1024,
            temperature=0.7,
            top_p=0.9,
        )
        return response.choices[0].message.content.strip()