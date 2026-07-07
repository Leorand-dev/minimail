"""Minimail — Settings service: shared Fernet cipher for password encryption.

The ENCRYPTION_KEY setting is expected to be a 32-byte URL-safe base64-encoded
Fernet key.  When the key is a plain 32-byte string (e.g. in dev), we derive a
valid Fernet key from it via SHA-256 so the module never crashes on import.
"""

from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet

from app.config import settings


def _make_fernet_key(raw: str) -> bytes:
    """Derive a valid 32-byte URL-safe base64 Fernet key from *raw*."""
    # Fernet expects exactly 32 url-safe base64-encoded bytes.
    # If the raw key is already valid base64 of the right length, use it as-is.
    if len(raw) == 44:  # standard base64-encoded 32-byte key length
        try:
            key = raw.encode("ascii")
            base64.urlsafe_b64decode(key)  # validate
            return key
        except Exception:
            pass
    # Derive a deterministic key via SHA-256 → url-safe base64.
    digest = hashlib.sha256(raw.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


# Shared cipher used by email_account etc. for IMAP/SMTP password encryption.
CIPHER = Fernet(_make_fernet_key(settings.encryption_key))
