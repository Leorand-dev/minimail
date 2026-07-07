"""
Webmail — API 路由包
"""

from app.api import auth, health, mail, contacts, api_tokens, email_accounts, memos, search, system_docs

__all__ = ["auth", "health", "mail", "contacts", "api_tokens", "email_accounts", "memos", "search", "system_docs"]
