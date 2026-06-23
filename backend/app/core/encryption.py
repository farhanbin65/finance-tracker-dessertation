"""
FinSight — AES-256-GCM Field Encryption
=========================================
Provides transparent encrypt/decrypt for sensitive PII fields
stored in MongoDB (email, full_name).

Algorithm: AES-256-GCM
  - 256-bit key derived from JWT_SECRET via SHA-256
  - 96-bit random nonce per encryption (GCM standard)
  - Authentication tag included — detects tampering
  - Output: base64(nonce + ciphertext + tag) stored as string in MongoDB

Lookup strategy:
  Email fields are also stored as SHA-256 HMAC hashes for indexed
  lookups, since encrypted ciphertext is not searchable directly.
  This mirrors the approach used in production fintech systems
  (e.g. Stripe's encrypted field indexing).

AT2 §3.3.6 — AES encryption, privacy-first data handling.
GDPR Article 5(1)(f) — appropriate security of personal data.
"""

import base64
import hashlib
import hmac
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _get_key() -> bytes:
    """
    Derive a 256-bit AES key from JWT_SECRET.
    SHA-256 of the secret gives exactly 32 bytes.
    Lazy import avoids circular dependency with config.
    """
    from app.core.config import config
    return hashlib.sha256(config.JWT_SECRET.encode()).digest()


def encrypt_field(plaintext: str) -> str:
    """
    Encrypt a string field with AES-256-GCM.
    Returns a base64-encoded string safe for MongoDB storage.
    Format: base64(12-byte nonce || ciphertext || 16-byte tag)
    """
    if not plaintext:
        return plaintext
    key   = _get_key()
    nonce = os.urandom(12)          # 96-bit nonce, unique per encryption
    aesgcm = AESGCM(key)
    ct     = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ct).decode("utf-8")


def decrypt_field(ciphertext: str) -> str:
    """
    Decrypt a base64-encoded AES-256-GCM ciphertext.
    Returns the original plaintext string.
    Returns ciphertext unchanged if it doesn't look encrypted
    (handles legacy plaintext documents during migration).
    """
    if not ciphertext:
        return ciphertext
    try:
        raw    = base64.b64decode(ciphertext)
        nonce  = raw[:12]
        ct     = raw[12:]
        key    = _get_key()
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
    except Exception:
        # Document is plaintext (pre-encryption migration) — return as-is
        return ciphertext


def hash_email_for_lookup(email: str) -> str:
    """
    One-way HMAC-SHA256 of the email for indexed lookups.
    Stored alongside the encrypted email so we can still
    do find_one({"email_hash": hash_email_for_lookup(email)})
    without exposing plaintext in the database.
    """
    from app.core.config import config
    return hmac.new(
        config.JWT_SECRET.encode(),
        email.lower().encode(),
        hashlib.sha256
    ).hexdigest()