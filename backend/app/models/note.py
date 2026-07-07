"""
Minimail — 笔记库 Note ORM 模型

基于 Memos 架构解构, 核心数据模型:
- Note: 笔记主体 (Markdown 内容 + 标签 + 可见性 + 置顶 + 归档)
- NoteTag: 标签聚合 (可选辅助)
- NoteReaction: 表情反应

参考: https://github.com/usememos/memos
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func, Index
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from pgvector.sqlalchemy import Vector

from app.database import Base


class Note(Base):
    """笔记核心表."""

    __tablename__ = "notes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)  # Markdown 源码
    visibility: Mapped[str] = mapped_column(
        String(16), default="private", nullable=False
    )
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("notes.id", ondelete="SET NULL"), nullable=True
    )  # 评论/线程: 非空即为某笔记的评论
    row_status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="active"
    )  # active / archived
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), nullable=False, default=list
    )  # PostgreSQL 原生数组
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # 关系
    user = relationship("User", back_populates="notes")
    attachments: Mapped[list["NoteAttachment"]] = relationship(
        back_populates="note", cascade="all, delete-orphan"
    )
    reactions: Mapped[list["NoteReaction"]] = relationship(
        back_populates="note", cascade="all, delete-orphan"
    )

    # ── 语义搜索 (pgvector) ──
    embedding: Mapped[Optional[list[float]]] = mapped_column(
        Vector(1536), nullable=True
    )

    # ── 全文搜索索引 (GIN on tsvector) ──
    __table_args__ = (
        Index(
            "ix_notes_content_tsv",
            func.to_tsvector("simple", func.coalesce("content", "")),
            postgresql_using="gin",
        ),
    )


class NoteAttachment(Base):
    """笔记附件."""

    __tablename__ = "note_attachments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    note_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(256), nullable=False)
    filepath: Mapped[str] = mapped_column(String(512), nullable=False)
    size: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(128), default="application/octet-stream")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # 关系
    note = relationship("Note", back_populates="attachments")


class NoteTag(Base):
    """标签聚合表 (可选辅助, 用于快速列出用户所有标签)."""

    __tablename__ = "note_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    note_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (UniqueConstraint("name", "user_id", name="uq_note_tag_name_user"),)


class NoteReaction(Base):
    """表情反应."""

    __tablename__ = "note_reactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    note_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("notes.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    emoji: Mapped[str] = mapped_column(String(32), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("note_id", "user_id", "emoji", name="uq_note_reaction"),
    )

    # 关系
    note = relationship("Note", back_populates="reactions")
