"""
Webmail — API 路由包
"""

from app.api import auth, health, mail, contacts, api_tokens, email_accounts

__all__ = ["auth", "health", "mail", "contacts", "api_tokens", "email_accounts"]
