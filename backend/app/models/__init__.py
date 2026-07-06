"""
Webmail — ORM 模型
"""

from app.models.user import User
from app.models.contact import Contact, ContactGroup

__all__ = ["User", "Contact", "ContactGroup"]
