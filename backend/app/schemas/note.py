"""
Minimail — 笔记库 Note Schema
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NoteResponse(BaseModel):
    """笔记响应."""

    id: uuid.UUID
    user_id: uuid.UUID
    content: str
    visibility: str = "private"
    pinned: bool = False
    parent_id: uuid.UUID | None = None
    row_status: str = "active"
    tags: list[str] = []
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class NoteCreate(BaseModel):
    """创建笔记."""

    content: str = Field(..., min_length=1, max_length=65536)
    visibility: str = Field(default="private", pattern=r"^(private|public)$")
    pinned: bool = False
    parent_id: uuid.UUID | None = None
    tags: list[str] = Field(default=[], max_length=20)


class NoteUpdate(BaseModel):
    """更新笔记."""

    content: Optional[str] = Field(None, max_length=65536)
    visibility: Optional[str] = Field(None, pattern=r"^(private|public)$")
    pinned: Optional[bool] = None
    row_status: Optional[str] = Field(None, pattern=r"^(active|archived)$")
    tags: Optional[list[str]] = Field(None, max_length=20)


class NoteListResponse(BaseModel):
    """笔记列表响应 (游标分页)."""

    notes: list[NoteResponse]
    next_page_token: str | None = None
    total: int = 0


class NoteTagResponse(BaseModel):
    """标签响应."""

    name: str
    note_count: int = 0


class NoteTagCreate(BaseModel):
    """创建标签."""

    name: str = Field(..., min_length=1, max_length=64)


class NoteTagRename(BaseModel):
    """重命名标签."""

    new_name: str = Field(..., min_length=1, max_length=64)


class NoteSearchQuery(BaseModel):
    """搜索参数 (GET query)."""

    q: str = Field(default="", description="全文搜索关键词")
    tag: str | None = Field(default=None, description="按标签过滤")
    visibility: str | None = Field(default=None, description="可见性过滤")
    page_size: int = Field(default=20, ge=1, le=100)
    cursor: str | None = Field(default=None, description="游标 (上一页最后一条的 created_at)")
