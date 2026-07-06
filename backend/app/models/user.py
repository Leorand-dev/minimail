"""
Webmail — 用户 ORM 模型
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(320), unique=True, index=True, nullable=False
    )
    username: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False, default=""
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False, default="")

    # ── IMAP 连接配置 (加密存储) ──
    imap_host: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    imap_port: Mapped[int] = mapped_column(Integer, default=993)
    imap_ssl: Mapped[bool] = mapped_column(Boolean, default=True)
    imap_username: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    imap_password_enc: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # ── SMTP 配置 ──
    smtp_host: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    smtp_port: Mapped[int] = mapped_column(Integer, default=465)
    smtp_ssl: Mapped[bool] = mapped_column(Boolean, default=True)
    smtp_username: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    smtp_password_enc: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # ── 偏好 ──
    language: Mapped[str] = mapped_column(String(10), default="zh_CN")
    theme: Mapped[str] = mapped_column(String(20), default="light")
    messages_per_page: Mapped[int] = mapped_column(Integer, default=50)
    preview_pane: Mapped[bool] = mapped_column(Boolean, default=True)

    # ── 配额 ──
    quota_mb: Mapped[int] = mapped_column(Integer, default=0)  # 0 = unlimited

    # ── 元数据 ──
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email}>"
