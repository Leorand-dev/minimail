"""
Webmail — 联系人 ORM 模型

支持:
- 个人联系人 (Contact)
- 联系人分组 (ContactGroup)
- 多邮箱/多电话
- 头像 URL
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ContactGroup(Base):
    """联系人分组."""

    __tablename__ = "contact_groups"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)  # #RRGGBB
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    contacts: Mapped[list["Contact"]] = relationship(
        "Contact", back_populates="group", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<ContactGroup id={self.id} name={self.name}>"


class Contact(Base):
    """联系人."""

    __tablename__ = "contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    group_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("contact_groups.id", ondelete="SET NULL"),
        nullable=True,
    )

    # 基本信息
    display_name: Mapped[str] = mapped_column(String(256), default="")
    first_name: Mapped[str] = mapped_column(String(128), default="")
    last_name: Mapped[str] = mapped_column(String(128), default="")
    nickname: Mapped[str] = mapped_column(String(128), default="")
    organization: Mapped[str] = mapped_column(String(256), default="")
    title: Mapped[str] = mapped_column(String(256), default="")

    # 邮箱 (支持多个)
    email: Mapped[str] = mapped_column(String(320), default="", index=True)
    email_alt: Mapped[list[str]] = mapped_column(ARRAY(String(320)), default=list)
    email_business: Mapped[str] = mapped_column(String(320), default="")

    # 电话
    phone: Mapped[str] = mapped_column(String(64), default="")
    phone_mobile: Mapped[str] = mapped_column(String(64), default="")
    phone_business: Mapped[str] = mapped_column(String(64), default="")

    # 地址
    address: Mapped[str] = mapped_column(Text, default="")
    address_business: Mapped[str] = mapped_column(Text, default="")

    # 其他
    website: Mapped[str] = mapped_column(String(512), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)

    # 元数据
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)
    last_contacted: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    group: Mapped[ContactGroup | None] = relationship(
        "ContactGroup", back_populates="contacts", lazy="selectin"
    )

    def __repr__(self) -> str:
        return f"<Contact id={self.id} name={self.display_name} email={self.email}>"
