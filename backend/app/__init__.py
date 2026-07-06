"""
Webmail — 后端应用包
"""

from app import config, database
from app.config import settings
from app.database import Base, get_db

__all__ = ["config", "database", "settings", "Base", "get_db"]
