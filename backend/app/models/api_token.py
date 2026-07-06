"""
Minimail — API 访问令牌 ORM 模型
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ApiToken(Base):
    """API 访问令牌 (类似 GitHub Personal Access Token)."""

    __tablename__ = "api_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)  # 令牌名称 (用户可读)
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False)  # SHA-256 哈希
    token_prefix: Mapped[str] = mapped_column(String(8), nullable=False)  # 前8位用于显示
    scopes: Mapped[str] = mapped_column(String(512), nullable=False, default="read")  # 逗号分隔
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user = relationship("User", backref="api_tokens")

    def __repr__(self) -> str:
        return f"<ApiToken id={self.id} name={self.name}>"
