"""
Minimail — 邮箱账户 ORM 模型

支持多账户: 每个用户可以配置多个邮箱账户，
每个账户独立存储 IMAP/SMTP 配置和加密密码。
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmailAccount(Base):
    __tablename__ = "email_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False, default="")
    email: Mapped[str] = mapped_column(String(320), nullable=False)

    # IMAP
    imap_host: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    imap_port: Mapped[int] = mapped_column(Integer, default=993)
    imap_ssl: Mapped[bool] = mapped_column(Boolean, default=True)
    imap_username: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    imap_password_enc: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # SMTP
    smtp_host: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_port: Mapped[int] = mapped_column(Integer, default=465)
    smtp_ssl: Mapped[bool] = mapped_column(Boolean, default=True)
    smtp_username: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    smtp_password_enc: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # 默认账户标记
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)

    # 元数据
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<EmailAccount id={self.id} email={self.email} user_id={self.user_id}>"
