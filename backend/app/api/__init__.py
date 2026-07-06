"""
Webmail — API 路由包
"""

from app.api import auth, health, mail, contacts, api_tokens

__all__ = ["auth", "health", "mail", "contacts", "api_tokens"]
