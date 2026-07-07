"""
Minimail — 笔记库 Note API

路由:
  - GET    /api/notes                 列表 (游标分页 + 过滤)
  - POST   /api/notes                 创建
  - GET    /api/notes/{id}            详情
  - PUT    /api/notes/{id}            更新
  - DELETE /api/notes/{id}            删除 (软删除 → archived)
  - POST   /api/notes/{id}/pin        切换置顶
  - POST   /api/notes/{id}/restore    恢复归档
  - GET    /api/notes/tags            用户标签列表
  - POST   /api/notes/tags            创建标签
  - PUT    /api/notes/tags/{name}     重命名标签
  - DELETE /api/notes/tags/{name}     删除标签 (从所有笔记中移除)
  - GET    /api/notes/search          全文搜索
  - POST   /api/notes/search/semantic 语义搜索 (外部 AI 传入 embedding)
  - POST   /api/notes/from-context    从外部上下文创建笔记 (Agent 专用)

参考: https://github.com/usememos/memos
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
import sqlalchemy
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.user import User
from app.schemas.note import (
    CreateNoteFromEmailRequest,
    FromContextRequest,
    NoteCreate,
    NoteListResponse,
    NoteResponse,
    NoteTagCreate,
    NoteTagRename,
    NoteTagResponse,
    NoteUpdate,
    SemanticSearchItem,
    SemanticSearchRequest,
    SemanticSearchResponse,
)
from app.services.auth import get_current_user

# 引入 ORM 模型
from app.models.note import Note as NoteModel, NoteTag as NoteTagModel

router = APIRouter(prefix="/api/notes", tags=["notes"])


# ─── 辅助函数 ───


async def _get_note_or_404(
    note_id: uuid.UUID, user: User, db: AsyncSession
) -> NoteModel:
    """获取笔记, 不存在或不属于当前用户时返回 404."""
    result = await db.execute(
        select(NoteModel).where(
            NoteModel.id == note_id, NoteModel.user_id == user.id
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    return note


# ─── 列表 (游标分页) ───


@router.get("", response_model=NoteListResponse)
async def list_notes(
    page_size: int = Query(default=20, ge=1, le=100),
    cursor: str = Query(default="", description="上一页最后一条的 created_at"),
    visibility: str = Query(default="", description="private / public / 空=全部"),
    tag: str = Query(default="", description="按标签过滤"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取笔记列表 (游标分页, 按 created_at 倒序)."""
    query = select(NoteModel).where(
        NoteModel.user_id == user.id,
        NoteModel.row_status == "active",
    )

    # 游标过滤: cursor 是上一页最后一条的 created_at ISO 字符串
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.where(NoteModel.created_at < cursor_dt)
        except ValueError:
            pass

    # 可见性过滤
    if visibility in ("private", "public"):
        query = query.where(NoteModel.visibility == visibility)

    # 标签过滤
    if tag:
        query = query.where(NoteModel.tags.any(tag))

    # 排序 + 分页
    query = (
        query.order_by(NoteModel.created_at.desc())
        .limit(page_size + 1)  # 多取一条用于判断是否有下一页
    )

    result = await db.execute(query)
    notes = result.scalars().all()

    has_more = len(notes) > page_size
    if has_more:
        notes = notes[:page_size]

    next_token = ""
    if has_more and notes:
        next_token = notes[-1].created_at.isoformat()

    # 统计总数
    count_q = select(func.count(NoteModel.id)).where(
        NoteModel.user_id == user.id,
        NoteModel.row_status == "active",
    )
    if visibility in ("private", "public"):
        count_q = count_q.where(NoteModel.visibility == visibility)
    if tag:
        count_q = count_q.where(NoteModel.tags.any(tag))
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    return NoteListResponse(
        notes=[NoteResponse.model_validate(n) for n in notes],
        next_page_token=next_token,
        total=total,
    )


# ─── 创建 ───


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    body: NoteCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新笔记."""
    note = NoteModel(
        user_id=user.id,
        content=body.content,
        visibility=body.visibility,
        pinned=body.pinned,
        parent_id=body.parent_id,
        tags=body.tags,
    )
    db.add(note)
    await db.flush()
    await db.refresh(note)

    # 同步标签聚合表
    if body.tags:
        for tag_name in body.tags:
            await _upsert_tag_count(tag_name, user.id, db, delta=1)

    return NoteResponse.model_validate(note)


# ─── 详情 ───


@router.get("/tags", response_model=list[NoteTagResponse])
async def list_tags(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的所有标签 (含计数)."""
    result = await db.execute(
        select(NoteTagModel).where(
            NoteTagModel.user_id == user.id
        ).order_by(NoteTagModel.note_count.desc())
    )
    tags = result.scalars().all()
    return [NoteTagResponse(name=t.name, note_count=t.note_count) for t in tags]


@router.post("/tags", response_model=NoteTagResponse, status_code=201)
async def create_tag(
    body: NoteTagCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建标签 (如果已存在则返回现有)."""
    result = await db.execute(
        select(NoteTagModel).where(
            NoteTagModel.name == body.name.strip(),
            NoteTagModel.user_id == user.id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return NoteTagResponse(name=existing.name, note_count=existing.note_count)

    tag = NoteTagModel(
        name=body.name.strip(),
        user_id=user.id,
        note_count=0,
    )
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return NoteTagResponse(name=tag.name, note_count=tag.note_count)


@router.put("/tags/{tag_name:path}", response_model=NoteTagResponse)
async def rename_tag(
    tag_name: str,
    body: NoteTagRename,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """重命名标签 (更新所有笔记中的标签名称)."""
    # 检查源标签是否存在
    result = await db.execute(
        select(NoteTagModel).where(
            NoteTagModel.name == tag_name,
            NoteTagModel.user_id == user.id,
        )
    )
    tag_row = result.scalar_one_or_none()
    if not tag_row:
        raise HTTPException(status_code=404, detail="标签不存在")

    new_name = body.new_name.strip()
    if new_name == tag_name:
        return NoteTagResponse(name=tag_row.name, note_count=tag_row.note_count)

    # 更新所有笔记: tags 数组中替换
    await db.execute(
        sqlalchemy.update(NoteModel)
        .where(
            NoteModel.user_id == user.id,
            NoteModel.tags.any(tag_name),
        )
        .values(
            tags=func.array_replace(NoteModel.tags, tag_name, new_name)
        )
    )

    # 更新聚合表
    # 检查目标标签是否已存在
    result2 = await db.execute(
        select(NoteTagModel).where(
            NoteTagModel.name == new_name,
            NoteTagModel.user_id == user.id,
        )
    )
    target = result2.scalar_one_or_none()
    if target:
        # 合并: 计数相加, 删除源
        target.note_count += tag_row.note_count
        await db.delete(tag_row)
        await db.flush()
        return NoteTagResponse(name=target.name, note_count=target.note_count)
    else:
        # 直接重命名
        tag_row.name = new_name
        await db.flush()
        await db.refresh(tag_row)
        return NoteTagResponse(name=tag_row.name, note_count=tag_row.note_count)


@router.delete("/tags/{tag_name:path}", status_code=204)
async def delete_tag(
    tag_name: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除标签 (从所有笔记中移除)."""
    # 从所有笔记中移除该标签
    await db.execute(
        sqlalchemy.update(NoteModel)
        .where(
            NoteModel.user_id == user.id,
            NoteModel.tags.any(tag_name),
        )
        .values(
            tags=func.array_remove(NoteModel.tags, tag_name)
        )
    )

    # 删除聚合记录
    await db.execute(
        sqlalchemy.delete(NoteTagModel).where(
            NoteTagModel.name == tag_name,
            NoteTagModel.user_id == user.id,
        )
    )
    await db.flush()


# ─── 全文搜索 ───


@router.get("/search", response_model=NoteListResponse)
async def search_notes(
    q: str = Query(default=""),
    tag: str = Query(default=""),
    visibility: str = Query(default=""),
    page_size: int = Query(default=20, ge=1, le=100),
    cursor: str = Query(default=""),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """全文搜索笔记 (PostgreSQL tsvector)."""
    query = select(NoteModel).where(
        NoteModel.user_id == user.id,
        NoteModel.row_status == "active",
    )

    # 全文搜索
    if q.strip():
        ts_query = func.plainto_tsquery("simple", q.strip())
        query = query.where(
            func.to_tsvector("simple", NoteModel.content).op("@@")(ts_query)
        )
        # 按相关性排序
        query = query.order_by(
            func.ts_rank(
                func.to_tsvector("simple", NoteModel.content), ts_query
            ).desc()
        )
    else:
        query = query.order_by(NoteModel.created_at.desc())

    # 游标过滤
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.where(NoteModel.created_at < cursor_dt)
        except ValueError:
            pass

    # 可见性过滤
    if visibility in ("private", "public"):
        query = query.where(NoteModel.visibility == visibility)

    # 标签过滤
    if tag:
        query = query.where(NoteModel.tags.any(tag))

    # 分页
    query = query.limit(page_size + 1)
    result = await db.execute(query)
    notes = result.scalars().all()

    has_more = len(notes) > page_size
    if has_more:
        notes = notes[:page_size]

    next_token = ""
    if has_more and notes:
        next_token = notes[-1].created_at.isoformat()

    return NoteListResponse(
        notes=[NoteResponse.model_validate(n) for n in notes],
        next_page_token=next_token,
        total=0,
    )


@router.get("/{note_id}", response_model=NoteResponse)
async def get_note(
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单条笔记详情."""
    note = await _get_note_or_404(note_id, user, db)
    return NoteResponse.model_validate(note)


# ─── 更新 ───


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    body: NoteUpdate,
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新笔记 (部分更新)."""
    note = await _get_note_or_404(note_id, user, db)

    update_fields = False

    if body.content is not None and body.content != note.content:
        note.content = body.content
        update_fields = True
    if body.visibility is not None and body.visibility != note.visibility:
        note.visibility = body.visibility
        update_fields = True
    if body.pinned is not None and body.pinned != note.pinned:
        note.pinned = body.pinned
        update_fields = True
    if body.row_status is not None and body.row_status != note.row_status:
        note.row_status = body.row_status
        update_fields = True
    if body.tags is not None:
        # 计算标签变更
        old_tags = set(note.tags)
        new_tags = set(body.tags)
        added = new_tags - old_tags
        removed = old_tags - new_tags
        if added or removed:
            note.tags = body.tags
            update_fields = True
            for t in added:
                await _upsert_tag_count(t, user.id, db, delta=1)
            for t in removed:
                await _upsert_tag_count(t, user.id, db, delta=-1)

    if not update_fields:
        return NoteResponse.model_validate(note)

    await db.flush()
    await db.refresh(note)
    return NoteResponse.model_validate(note)


# ─── 删除 (软删除) ───


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除笔记 (软删除 → row_status=archived)."""
    note = await _get_note_or_404(note_id, user, db)
    note.row_status = "archived"
    await db.flush()


# ─── 切换置顶 ───


@router.post("/{note_id}/pin", response_model=NoteResponse)
async def toggle_pin(
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """切换笔记置顶状态."""
    note = await _get_note_or_404(note_id, user, db)
    note.pinned = not note.pinned
    await db.flush()
    await db.refresh(note)
    return NoteResponse.model_validate(note)


# ─── 恢复归档 ───


@router.post("/{note_id}/restore", response_model=NoteResponse)
async def restore_note(
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """恢复归档笔记."""
    note = await _get_note_or_404(note_id, user, db)
    note.row_status = "active"
    await db.flush()
    await db.refresh(note)
    return NoteResponse.model_validate(note)


@router.post("/search/semantic", response_model=SemanticSearchResponse)
async def semantic_search(
    body: SemanticSearchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """语义搜索 — 外部 AI Agent 传入 embedding 向量, 返回最相似笔记.

    外部 AI 使用自身的 embedding 模型计算 query 向量后传入,
    Minimail 仅作为向量存储和检索后端, 不做 embedding 计算.
    """
    # 构建基础查询
    query = select(
        NoteModel,
        NoteModel.embedding.cosine_distance(body.embedding).label("score"),
    ).where(
        NoteModel.user_id == user.id,
        NoteModel.row_status == "active",
        NoteModel.embedding.isnot(None),
    )

    # 标签过滤
    if body.tag:
        query = query.where(NoteModel.tags.any(body.tag))

    # 可见性过滤
    if body.visibility in ("private", "public"):
        query = query.where(NoteModel.visibility == body.visibility)

    query = query.order_by(sqlalchemy.text("score ASC")).limit(body.top_k)

    result = await db.execute(query)
    rows = result.all()

    items = [
        SemanticSearchItem(
            note=NoteResponse.model_validate(row.NoteModel),
            score=float(round((1 - row.score) * 100, 2)),
        )
        for row in rows
    ]

    return SemanticSearchResponse(results=items)


@router.post("/from-context", response_model=NoteResponse, status_code=201)
async def create_from_context(
    body: FromContextRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """从外部上下文创建笔记 — Agent 专用端点.

    外部 AI Agent 可将对话记录、邮件内容等传入,
    系统自动创建笔记并可选存入 embedding 向量.
    """
    # 源信息作为备注写入内容首行
    source_prefix = f"> *来源: {body.source}*\n\n" if body.source else ""

    note = NoteModel(
        content=source_prefix + body.content.strip(),
        user_id=user.id,
        tags=list(set(t.strip() for t in body.tags if t.strip())),
        visibility=body.visibility,
    )

    if body.embedding:
        note.embedding = body.embedding

    db.add(note)
    await db.flush()
    await db.refresh(note)

    # 更新标签计数
    for tag_name in note.tags:
        await _upsert_tag_count(tag_name, user.id, db, delta=1)

    return NoteResponse.model_validate(note)


@router.post("/from-email", response_model=NoteResponse, status_code=201)
async def create_note_from_email(
    body: CreateNoteFromEmailRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """从邮件内容创建笔记 — 前端直接传入邮件字段."""
    # 格式化笔记内容
    lines = [f"# 📧 {body.subject or '无主题'}"]
    lines.append("")
    lines.append(f"> **发件人**: {body.sender}")
    lines.append(f"> **日期**: {body.date}")
    if body.folder:
        lines.append(f"> **文件夹**: {body.folder}")
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append(body.body.strip())

    content = "\n".join(lines)

    tags = list(set(t.strip() for t in body.tags if t.strip()))

    note = NoteModel(
        content=content,
        user_id=user.id,
        tags=tags,
        visibility="private",
    )
    db.add(note)
    await db.flush()
    await db.refresh(note)

    for tag_name in note.tags:
        await _upsert_tag_count(tag_name, user.id, db, delta=1)

    return NoteResponse.model_validate(note)


# ─── 内部辅助 ───


async def _upsert_tag_count(
    tag_name: str, user_id: uuid.UUID, db: AsyncSession, delta: int = 1
) -> None:
    """更新标签计数 (增/减)."""
    result = await db.execute(
        select(NoteTagModel).where(
            NoteTagModel.name == tag_name,
            NoteTagModel.user_id == user_id,
        )
    )
    tag_row = result.scalar_one_or_none()
    if tag_row:
        tag_row.note_count = max(0, tag_row.note_count + delta)
    elif delta > 0:
        db.add(NoteTagModel(name=tag_name, user_id=user_id, note_count=1))
    await db.flush()
