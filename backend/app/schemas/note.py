"""
Minimail — 笔记库 Note Schema
"""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class NoteAttachmentResponse(BaseModel):
    """附件响应."""

    id: str
    note_id: str
    filename: str
    size: int
    mime_type: str
    created_at: str | None = None
    url: str = ""


class NoteReactionResponse(BaseModel):
    """笔记反应."""

    emoji: str
    count: int = 1
    reacted: bool = False


class NoteProperty(BaseModel):
    """笔记内容属性 (从 Markdown 内容计算)."""

    has_link: bool = False
    has_code: bool = False
    has_task_list: bool = False
    has_incomplete_tasks: bool = False
    title: str = ""
    auto_tags: list[str] = []


def extract_note_properties(content: str) -> NoteProperty:
    """从 Markdown 内容提取属性和标签."""
    props = NoteProperty()

    if not content:
        return props

    # 标题: 第一个 H1
    h1_match = re.search(r"^# (.+)$", content, re.MULTILINE)
    if h1_match:
        props.title = h1_match.group(1).strip()[:200]

    # 链接 (Markdown 链接或裸 URL)
    if re.search(r"\[.+?\]\(.+?\)|https?://[^\s)>\"]+", content):
        props.has_link = True

    # 代码块 (fenced)
    if re.search(r"```|~~~", content):
        props.has_code = True

    # 任务列表
    task_items = re.findall(r"- \[([ x]?)\]", content, re.IGNORECASE)
    if task_items:
        props.has_task_list = True
        if any(t.strip() == "" or t.strip() == " " for t in task_items):
            props.has_incomplete_tasks = True

    # 自动提取标签 (#tag)
    tags = re.findall(
        r"#([a-zA-Z\u4e00-\u9fff][a-zA-Z0-9\u4e00-\u9fff_-]*)", content
    )
    props.auto_tags = list(dict.fromkeys(t.lower() for t in tags if len(t) <= 32))

    return props


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
    property: NoteProperty | None = None

    model_config = {"from_attributes": True}  # type: ignore[arg-type]


class NoteResponseWithReactions(BaseModel):
    """笔记响应 (含反应)."""

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
    reactions: list[NoteReactionResponse] = []
    property: NoteProperty | None = None

    model_config = {"from_attributes": True}  # type: ignore[arg-type]


class NoteCreate(BaseModel):
    """创建笔记请求."""

    content: str = Field(..., min_length=1, max_length=65536)
    visibility: str = "private"
    pinned: bool = False
    parent_id: uuid.UUID | None = None
    tags: list[str] = []


class NoteUpdate(BaseModel):
    """更新笔记请求."""

    content: Optional[str] = None
    visibility: Optional[str] = None
    pinned: Optional[bool] = None
    row_status: Optional[str] = None
    tags: Optional[list[str]] = None


class NoteListResponse(BaseModel):
    """笔记列表响应."""

    notes: list[NoteResponse]
    next_page_token: str | None = None
    total: int = 0


class NoteTagCreate(BaseModel):
    """创建标签请求."""

    name: str = Field(..., min_length=1, max_length=64)


class NoteTagRename(BaseModel):
    """重命名标签请求."""

    new_name: str = Field(..., min_length=1, max_length=64)


class NoteTagResponse(BaseModel):
    """标签响应."""

    id: int
    name: str
    note_count: int = 0
    created_at: str | None = None


class SemanticSearchItem(BaseModel):
    """语义搜索结果项."""

    id: uuid.UUID
    content: str
    score: float
    tags: list[str] = []
    created_at: datetime | None = None
    snippet: str = ""


class SemanticSearchRequest(BaseModel):
    """语义搜索请求."""

    query: str = ""
    embedding: list[float] = []
    top_k: int = 10
    tag: str = ""
    visibility: str = ""


class SemanticSearchResponse(BaseModel):
    """语义搜索响应."""

    results: list[SemanticSearchItem]


class CreateNoteFromEmailRequest(BaseModel):
    """从邮件创建笔记请求."""

    subject: str
    sender: str
    body: str
    date: str
    folder: str | None = None
    tags: list[str] = []


class FromContextRequest(BaseModel):
    """从外部上下文创建笔记请求 (Agent 专用)."""

    content: str = Field(..., min_length=1, max_length=65536)
    tags: list[str] = []
    visibility: str = "private"
    source: str = ""
    embedding: list[float] = []


class UnifiedSearchItem(BaseModel):
    """统一搜索结果项."""

    id: str
    type_: str
    title: str
    snippet: str
    tags: list[str] = []
    url: str = ""
    created_at: str | None = None


class UnifiedSearchResponse(BaseModel):
    """统一搜索结果."""

    results: list[UnifiedSearchItem]
    total: int
    query: str


class LinkMetadataResponse(BaseModel):
    """链接元数据."""

    url: str
    title: str = ""
    description: str = ""
    image: str = ""


class CommentCreateRequest(BaseModel):
    """创建评论."""

    content: str = Field(..., min_length=1, max_length=65536)


class LinkMetadataRequest(BaseModel):
    """链接元数据请求."""

    url: str = Field(..., max_length=2048)
