"""
Webmail — API 路由包
"""

from app.api import auth, health, mail, contacts, api_tokens, email_accounts, auto_detect, files, memos, search, shares, system_docs, mail_batch

__all__ = ["auth", "health", "mail", "contacts", "api_tokens", "email_accounts", "auto_detect", "files", "memos", "search", "shares", "system_docs", "mail_batch"]
