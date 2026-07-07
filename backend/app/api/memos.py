"""
Minimail — 笔记库 Note API
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Path, Query, status, UploadFile, File
from fastapi.responses import FileResponse
from pathlib import Path as FilePath
import sqlalchemy
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sse_starlette.sse import EventSourceResponse

from app.database import get_db
from app.models.note import (
    Note as NoteModel,
    NoteTag as NoteTagModel,
    NoteReaction as NoteReactionModel,
    NoteAttachment as NoteAttachmentModel,
    NoteShare as NoteShareModel,
    NoteShortcut as NoteShortcutModel,
    Webhook as WebhookModel,
)
from app.models.user import User
from app.schemas.note import (
    CommentCreateRequest,
    CreateNoteFromEmailRequest,
    FromContextRequest,
    LinkMetadataRequest,
    LinkMetadataResponse,
    NoteAttachmentResponse,
    NoteCreate,
    NoteEvent,
    NoteListResponse,
    NoteReactionResponse,
    NoteResponse,
    NoteResponseWithReactions,
    NoteSettingsResponse,
    NoteShareCreate,
    NoteShareResponse,
    NoteShortcutCreate,
    NoteShortcutResponse,
    NoteShortcutUpdate,
    NoteTagCreate,
    NoteTagRename,
    NoteTagResponse,
    NoteUpdate,
    SemanticSearchItem,
    SemanticSearchRequest,
    SemanticSearchResponse,
    WebhookCreate,
    WebhookResponse,
    WebhookUpdate,
    extract_note_properties,
)
from app.services.auth import get_current_user

logger = logging.getLogger("minimail.memos")

router = APIRouter(prefix="/api/notes", tags=["notes"])

# ─── SSE 事件总线 (内存) ───
_sse_subscribers: dict[uuid.UUID, list[asyncio.Queue]] = {}


# ─── 辅助函数 ───


async def _get_note_or_404(
    note_id: uuid.UUID, user: User, db: AsyncSession
) -> NoteModel:
    result = await db.execute(
        select(NoteModel).where(
            NoteModel.id == note_id, NoteModel.user_id == user.id
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在")
    return note

def _note_to_response(note: NoteModel) -> NoteResponse:
    """ORM note → NoteResponse (包含计算属性)."""
    resp = NoteResponse(
        id=note.id, user_id=note.user_id, content=note.content,
        visibility=note.visibility, pinned=note.pinned,
        parent_id=note.parent_id, row_status=note.row_status,
        tags=note.tags, created_at=note.created_at, updated_at=note.updated_at,
    )
    resp.property = extract_note_properties(note.content)
    return resp


# ─── 列表 ───


@router.get("", response_model=NoteListResponse)
async def list_notes(
    page_size: int = Query(default=20, ge=1, le=100),
    cursor: str = Query(default="", description="上一页最后一条的 created_at"),
    visibility: str = Query(default="", description="private / public / protected / 空=全部"),
    tag: str = Query(default="", description="按标签过滤"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(NoteModel).where(
        NoteModel.user_id == user.id,
        NoteModel.row_status == "active",
    )
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.where(NoteModel.created_at < cursor_dt)
        except ValueError:
            pass
    if visibility in ("private", "public", "protected"):
        query = query.where(NoteModel.visibility == visibility)
    if tag:
        query = query.where(NoteModel.tags.any(tag))
    query = query.order_by(NoteModel.created_at.desc()).limit(page_size + 1)
    result = await db.execute(query)
    notes = result.scalars().all()
    has_more = len(notes) > page_size
    if has_more:
        notes = notes[:page_size]
    next_token = notes[-1].created_at.isoformat() if has_more and notes else ""

    count_q = select(func.count(NoteModel.id)).where(
        NoteModel.user_id == user.id, NoteModel.row_status == "active",
    )
    if visibility in ("private", "public", "protected"):
        count_q = count_q.where(NoteModel.visibility == visibility)
    if tag:
        count_q = count_q.where(NoteModel.tags.any(tag))
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    reactions_map = await _batch_get_reactions(db, [n.id for n in notes], user.id)
    return NoteListResponse(
        notes=[_note_with_reactions(n, reactions_map.get(n.id, [])) for n in notes],
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

    # 自动标签: 从内容中提取 #tag
    tags_from_content = extract_note_properties(note.content).auto_tags
    if tags_from_content:
        new_tags = list(set(note.tags + tags_from_content))
        if len(new_tags) != len(note.tags):
            note.tags = new_tags
            await db.flush()
            for t in tags_from_content:
                await _upsert_tag_count(t, user.id, db, delta=1)

    # 重新查询以确保所有属性已加载
    result = await db.execute(select(NoteModel).where(NoteModel.id == note.id))
    fresh_note = result.scalar_one_or_none()
    resp = _note_to_response(fresh_note or note)
    asyncio.ensure_future(_broadcast_note_event(
        "note.created", fresh_note.id if fresh_note else note.id, user.id,
        {"content_preview": resp.content[:200] if resp.content else ""},
    ))
    return resp


# ─── 标签管理 ───


@router.get("/tags", response_model=list[NoteTagResponse])
async def list_tags(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NoteTagModel).where(
            NoteTagModel.user_id == user.id
        ).order_by(NoteTagModel.note_count.desc())
    )
    tags = result.scalars().all()
    return [NoteTagResponse(id=t.id, name=t.name, note_count=t.note_count, created_at=t.created_at.isoformat() if t.created_at else None) for t in tags]


@router.post("/tags", response_model=NoteTagResponse, status_code=201)
async def create_tag(
    body: NoteTagCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(NoteTagModel).where(
            NoteTagModel.name == body.name.strip(),
            NoteTagModel.user_id == user.id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return NoteTagResponse(id=existing.id, name=existing.name, note_count=existing.note_count, created_at=existing.created_at.isoformat() if existing.created_at else None)
    tag = NoteTagModel(name=body.name.strip(), user_id=user.id, note_count=0)
    db.add(tag)
    await db.flush()
    await db.refresh(tag)
    return NoteTagResponse(id=tag.id, name=tag.name, note_count=tag.note_count, created_at=tag.created_at.isoformat() if tag.created_at else None)


@router.put("/tags/{tag_name:path}", response_model=NoteTagResponse)
async def rename_tag(
    tag_name: str,
    body: NoteTagRename,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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
        return NoteTagResponse(id=tag_row.id, name=tag_row.name, note_count=tag_row.note_count, created_at=tag_row.created_at.isoformat() if tag_row.created_at else None)
    # 更新所有笔记
    await db.execute(
        sqlalchemy.update(NoteModel)
        .where(NoteModel.user_id == user.id, NoteModel.tags.any(tag_name))
        .values(tags=func.array_replace(NoteModel.tags, tag_name, new_name))
    )
    result2 = await db.execute(
        select(NoteTagModel).where(
            NoteTagModel.name == new_name,
            NoteTagModel.user_id == user.id,
        )
    )
    target = result2.scalar_one_or_none()
    if target:
        target.note_count += tag_row.note_count
        await db.delete(tag_row)
        await db.flush()
        return NoteTagResponse(id=target.id, name=target.name, note_count=target.note_count, created_at=target.created_at.isoformat() if target.created_at else None)
    tag_row.name = new_name
    await db.flush()
    await db.refresh(tag_row)
    return NoteTagResponse(id=tag_row.id, name=tag_row.name, note_count=tag_row.note_count, created_at=tag_row.created_at.isoformat() if tag_row.created_at else None)


@router.delete("/tags/{tag_name:path}", status_code=204)
async def delete_tag(
    tag_name: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        sqlalchemy.update(NoteModel)
        .where(NoteModel.user_id == user.id, NoteModel.tags.any(tag_name))
        .values(tags=func.array_remove(NoteModel.tags, tag_name))
    )
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
    query = select(NoteModel).where(
        NoteModel.user_id == user.id,
        NoteModel.row_status == "active",
    )
    if q.strip():
        ts_query = func.plainto_tsquery("simple", q.strip())
        query = query.where(
            func.to_tsvector("simple", NoteModel.content).op("@@")(ts_query)
        ).order_by(func.ts_rank(func.to_tsvector("simple", NoteModel.content), ts_query).desc())
    else:
        query = query.order_by(NoteModel.created_at.desc())
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.where(NoteModel.created_at < cursor_dt)
        except ValueError:
            pass
    if visibility in ("private", "public", "protected"):
        query = query.where(NoteModel.visibility == visibility)
    if tag:
        query = query.where(NoteModel.tags.any(tag))
    query = query.limit(page_size + 1)
    result = await db.execute(query)
    notes = result.scalars().all()
    has_more = len(notes) > page_size
    if has_more:
        notes = notes[:page_size]
    next_token = notes[-1].created_at.isoformat() if has_more and notes else ""
    return NoteListResponse(
        notes=[_note_to_response(n) for n in notes],
        next_page_token=next_token,
        total=0,
    )


@router.get("/{note_id}", response_model=NoteResponseWithReactions)
async def get_note(
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = await _get_note_or_404(note_id, user, db)
    reactions = await _get_reactions_for_note(db, note_id, user.id)
    return _note_with_reactions(note, reactions)


# ─── 更新 ───


@router.put("/{note_id}", response_model=NoteResponse)
async def update_note(
    body: NoteUpdate,
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = await _get_note_or_404(note_id, user, db)
    update_fields = False

    if body.content is not None and body.content != note.content:
        note.content = body.content
        update_fields = True
        # 重新提取自动标签
        auto_tags = extract_note_properties(note.content).auto_tags
        old_auto = [t for t in note.tags if not t.startswith("_")]
        new_tags = list(set(note.tags + auto_tags))
        if len(new_tags) != len(note.tags):
            note.tags = new_tags
            for t in auto_tags:
                await _upsert_tag_count(t, user.id, db, delta=1)
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
        old_tags = set(note.tags)
        new_tags_set = set(body.tags)
        added = new_tags_set - old_tags
        removed = old_tags - new_tags_set
        if added or removed:
            note.tags = body.tags
            update_fields = True
            for t in added:
                await _upsert_tag_count(t, user.id, db, delta=1)
            for t in removed:
                await _upsert_tag_count(t, user.id, db, delta=-1)

    if not update_fields:
        return _note_to_response(note)
    await db.flush()
    await db.refresh(note)
    resp = _note_to_response(note)
    asyncio.ensure_future(_broadcast_note_event(
        "note.updated", note.id, user.id,
        {"content_preview": resp.content[:200] if resp.content else ""},
    ))
    return resp


# ─── 删除 (软删除) ───


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = await _get_note_or_404(note_id, user, db)
    note.row_status = "archived"
    await db.flush()
    asyncio.ensure_future(_broadcast_note_event(
        "note.deleted", note.id, user.id,
        {"row_status": "archived"},
    ))


# ─── 切换置顶 ───


@router.post("/{note_id}/pin", response_model=NoteResponse)
async def toggle_pin(
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = await _get_note_or_404(note_id, user, db)
    note.pinned = not note.pinned
    await db.flush()
    await db.refresh(note)
    resp = _note_to_response(note)
    asyncio.ensure_future(_broadcast_note_event(
        "note.pinned", note.id, user.id,
        {"pinned": note.pinned},
    ))
    return resp


# ─── 恢复归档 ───


@router.post("/{note_id}/restore", response_model=NoteResponse)
async def restore_note(
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = await _get_note_or_404(note_id, user, db)
    note.row_status = "active"
    await db.flush()
    await db.refresh(note)
    resp = _note_to_response(note)
    asyncio.ensure_future(_broadcast_note_event(
        "note.restored", note.id, user.id,
        {"row_status": "active"},
    ))
    return resp


# ─── 语义搜索 ───


@router.post("/search/semantic", response_model=SemanticSearchResponse)
async def semantic_search(
    body: SemanticSearchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(
        NoteModel,
        NoteModel.embedding.cosine_distance(body.embedding).label("score"),
    ).where(
        NoteModel.user_id == user.id,
        NoteModel.row_status == "active",
        NoteModel.embedding.isnot(None),
    )
    if body.tag:
        query = query.where(NoteModel.tags.any(body.tag))
    if body.visibility in ("private", "public", "protected"):
        query = query.where(NoteModel.visibility == body.visibility)
    query = query.order_by(sqlalchemy.text("score ASC")).limit(body.top_k)
    result = await db.execute(query)
    rows = result.all()
    items = []
    for row in rows:
        note_model = row[0]  # the NoteModel entity
        score_val = float(round((1 - row[1]) * 100, 2))  # cosine_distance labeled "score"
        items.append(SemanticSearchItem(
            id=note_model.id,
            content=note_model.content,
            score=score_val,
            tags=note_model.tags,
            created_at=note_model.created_at,
            snippet=note_model.content[:200],
        ))
    return SemanticSearchResponse(results=items)


@router.post("/from-context", response_model=NoteResponse, status_code=201)
async def create_from_context(
    body: FromContextRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
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
    for tag_name in note.tags:
        await _upsert_tag_count(tag_name, user.id, db, delta=1)
    return _note_to_response(note)


# ─── 反应 ───


@router.post("/{note_id}/reactions", response_model=NoteResponseWithReactions)
async def toggle_reaction(
    emoji: str = Query(..., min_length=1, max_length=32),
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    note = await _get_note_or_404(note_id, user, db)
    result = await db.execute(
        select(NoteReactionModel).where(
            NoteReactionModel.note_id == note_id,
            NoteReactionModel.user_id == user.id,
            NoteReactionModel.emoji == emoji,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
    else:
        db.add(NoteReactionModel(note_id=note_id, user_id=user.id, emoji=emoji))
    await db.flush()
    await db.refresh(note)
    reactions = await _get_reactions_for_note(db, note_id, user.id)
    return _note_with_reactions(note, reactions)


# ─── 附件上传 ───


@router.post("/{note_id}/attachments", response_model=NoteAttachmentResponse, status_code=201)
async def upload_attachment(
    note_id: uuid.UUID = Path(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_note_or_404(note_id, user, db)
    upload_dir = FilePath(__file__).resolve().parent.parent.parent / "uploads" / "notes"
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4()
    ext = FilePath(file.filename or "file").suffix if file.filename else ""
    save_name = f"{file_id}{ext}"
    save_path = upload_dir / save_name
    content = await file.read()
    save_path.write_bytes(content)
    att = NoteAttachmentModel(
        id=file_id, note_id=note_id, filename=file.filename or "unnamed",
        filepath=str(save_path), size=len(content), mime_type=file.content_type or "application/octet-stream",
    )
    db.add(att)
    await db.flush()
    await db.refresh(att)
    return _attachment_to_response(att)


@router.get("/{note_id}/attachments", response_model=list[NoteAttachmentResponse])
async def list_attachments(
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_note_or_404(note_id, user, db)
    result = await db.execute(
        select(NoteAttachmentModel).where(NoteAttachmentModel.note_id == note_id)
        .order_by(NoteAttachmentModel.created_at.desc())
    )
    return [_attachment_to_response(a) for a in result.scalars().all()]


# ─── 评论 ───


@router.post("/{note_id}/comments", response_model=NoteResponse, status_code=201)
async def create_comment(
    body: CommentCreateRequest,
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    parent = await _get_note_or_404(note_id, user, db)
    comment = NoteModel(
        content=body.content, user_id=user.id, parent_id=note_id,
        visibility=parent.visibility, tags=[],
    )
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    return _note_to_response(comment)


@router.get("/{note_id}/comments", response_model=list[NoteResponse])
async def list_comments(
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_note_or_404(note_id, user, db)
    result = await db.execute(
        select(NoteModel).where(
            NoteModel.parent_id == note_id, NoteModel.row_status == "active",
        ).order_by(NoteModel.created_at.asc())
    )
    return [_note_to_response(c) for c in result.scalars().all()]


# ─── 链接元数据 ───


@router.post("/link-metadata", response_model=LinkMetadataResponse)
async def get_link_metadata(
    body: LinkMetadataRequest,
    user: User = Depends(get_current_user),
):
    try:
        import httpx
        from bs4 import BeautifulSoup
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(body.url, headers={"User-Agent": "Minimail/1.0"})
            resp.raise_for_status()
            html = resp.text
        soup = BeautifulSoup(html, "html.parser")

        def _og(key: str) -> str:
            tag = soup.find("meta", property=f"og:{key}") or soup.find("meta", attrs={"name": f"og:{key}"})
            return tag.get("content", "") if tag else ""

        title = _og("title") or (soup.title.string.strip() if soup.title else "")
        return LinkMetadataResponse(
            url=body.url, title=title[:500],
            description=_og("description")[:1000], image=_og("image")[:1000],
        )
    except Exception:
        return LinkMetadataResponse(url=body.url)


# ─── 从邮件创建笔记 ───


@router.post("/from-email", response_model=NoteResponse, status_code=201)
async def create_note_from_email(
    body: CreateNoteFromEmailRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lines = [f"# 📧 {body.subject or '无主题'}", "",
             f"> **发件人**: {body.sender}", f"> **日期**: {body.date}"]
    if body.folder:
        lines.append(f"> **文件夹**: {body.folder}")
    lines.extend(["", "---", "", body.body.strip()])
    content = "\n".join(lines)
    tags = list(set(t.strip() for t in body.tags if t.strip()))
    note = NoteModel(content=content, user_id=user.id, tags=tags, visibility="private")
    db.add(note)
    await db.flush()
    await db.refresh(note)
    for tag_name in note.tags:
        await _upsert_tag_count(tag_name, user.id, db, delta=1)
    return _note_to_response(note)


# ─── SSE 实时事件 ───


@router.get("/events", include_in_schema=False)
async def sse_events(
    user: User = Depends(get_current_user),
):
    """SSE 端点: 订阅笔记变更事件."""
    queue: asyncio.Queue = asyncio.Queue()
    _sse_subscribers.setdefault(user.id, []).append(queue)
    try:

        async def event_generator():
            while True:
                event_data = await queue.get()
                yield {"event": event_data["event"], "data": json.dumps(event_data, ensure_ascii=False)}

        return EventSourceResponse(event_generator())
    finally:
        qlist = _sse_subscribers.get(user.id, [])
        if queue in qlist:
            qlist.remove(queue)
        if not _sse_subscribers.get(user.id):
            _sse_subscribers.pop(user.id, None)


# ─── 分享链接 CRUD ───


@router.post("/{note_id}/shares", response_model=NoteShareResponse, status_code=201)
async def create_share_link(
    body: NoteShareCreate,
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建笔记分享链接."""
    note = await _get_note_or_404(note_id, user, db)
    if not user.note_allow_shares:
        raise HTTPException(status_code=403, detail="分享功能已关闭")
    share = NoteShareModel(
        note_id=note_id,
        user_id=user.id,
        token=uuid.uuid4().hex[:16],
        expires_at=body.expires_at,
    )
    db.add(share)
    await db.flush()
    await db.refresh(share)
    return NoteShareResponse(
        id=share.id,
        note_id=share.note_id,
        token=share.token,
        expires_at=share.expires_at,
        created_at=share.created_at,
        url=f"/api/shares/{share.token}",
    )


@router.get("/{note_id}/shares", response_model=list[NoteShareResponse])
async def list_share_links(
    note_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """列出笔记的分享链接."""
    await _get_note_or_404(note_id, user, db)
    result = await db.execute(
        select(NoteShareModel).where(
            NoteShareModel.note_id == note_id,
        ).order_by(NoteShareModel.created_at.desc())
    )
    shares = result.scalars().all()
    return [
        NoteShareResponse(
            id=s.id,
            note_id=s.note_id,
            token=s.token,
            expires_at=s.expires_at,
            created_at=s.created_at,
            url=f"/api/shares/{s.token}",
        )
        for s in shares
    ]


@router.delete("/{note_id}/shares/{share_id}", status_code=204)
async def delete_share_link(
    note_id: uuid.UUID = Path(...),
    share_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除分享链接."""
    note = await _get_note_or_404(note_id, user, db)
    result = await db.execute(
        select(NoteShareModel).where(
            NoteShareModel.id == share_id,
            NoteShareModel.note_id == note_id,
            NoteShareModel.user_id == user.id,
        )
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="分享链接不存在")
    await db.delete(share)
    await db.flush()


# ─── 快捷入口 CRUD ───


@router.get("/shortcuts", response_model=list[NoteShortcutResponse])
async def list_shortcuts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """列出用户的快捷入口."""
    result = await db.execute(
        select(NoteShortcutModel).where(
            NoteShortcutModel.user_id == user.id,
        ).order_by(NoteShortcutModel.sort_order.asc(), NoteShortcutModel.created_at.asc())
    )
    return [NoteShortcutResponse.model_validate(s) for s in result.scalars().all()]


@router.post("/shortcuts", response_model=NoteShortcutResponse, status_code=201)
async def create_shortcut(
    body: NoteShortcutCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建快捷入口."""
    shortcut = NoteShortcutModel(
        user_id=user.id,
        name=body.name,
        icon=body.icon or "🔖",
        filter_tag=body.filter_tag or "",
        filter_visibility=body.filter_visibility or "",
        sort_order=body.sort_order,
    )
    db.add(shortcut)
    await db.flush()
    await db.refresh(shortcut)
    return NoteShortcutResponse.model_validate(shortcut)


@router.put("/shortcuts/{shortcut_id}", response_model=NoteShortcutResponse)
async def update_shortcut(
    body: NoteShortcutUpdate,
    shortcut_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新快捷入口."""
    result = await db.execute(
        select(NoteShortcutModel).where(
            NoteShortcutModel.id == shortcut_id,
            NoteShortcutModel.user_id == user.id,
        )
    )
    shortcut = result.scalar_one_or_none()
    if not shortcut:
        raise HTTPException(status_code=404, detail="快捷入口不存在")
    if body.name is not None:
        shortcut.name = body.name
    if body.icon is not None:
        shortcut.icon = body.icon
    if body.filter_tag is not None:
        shortcut.filter_tag = body.filter_tag
    if body.filter_visibility is not None:
        shortcut.filter_visibility = body.filter_visibility
    if body.sort_order is not None:
        shortcut.sort_order = body.sort_order
    await db.flush()
    await db.refresh(shortcut)
    return NoteShortcutResponse.model_validate(shortcut)


@router.delete("/shortcuts/{shortcut_id}", status_code=204)
async def delete_shortcut(
    shortcut_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除快捷入口."""
    result = await db.execute(
        select(NoteShortcutModel).where(
            NoteShortcutModel.id == shortcut_id,
            NoteShortcutModel.user_id == user.id,
        )
    )
    shortcut = result.scalar_one_or_none()
    if not shortcut:
        raise HTTPException(status_code=404, detail="快捷入口不存在")
    await db.delete(shortcut)
    await db.flush()


# ─── Webhook CRUD ───


@router.get("/webhooks", response_model=list[WebhookResponse])
async def list_webhooks(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """列出用户的 Webhook."""
    result = await db.execute(
        select(WebhookModel).where(
            WebhookModel.user_id == user.id,
        ).order_by(WebhookModel.created_at.desc())
    )
    return [WebhookResponse.model_validate(w) for w in result.scalars().all()]


@router.post("/webhooks", response_model=WebhookResponse, status_code=201)
async def create_webhook(
    body: WebhookCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建 Webhook."""
    wh = WebhookModel(
        user_id=user.id,
        url=body.url,
        events=body.events or ["note.created"],
        secret=body.secret or "",
    )
    db.add(wh)
    await db.flush()
    await db.refresh(wh)
    return WebhookResponse.model_validate(wh)


@router.put("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    body: WebhookUpdate,
    webhook_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新 Webhook."""
    result = await db.execute(
        select(WebhookModel).where(
            WebhookModel.id == webhook_id,
            WebhookModel.user_id == user.id,
        )
    )
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook 不存在")
    if body.url is not None:
        wh.url = body.url
    if body.events is not None:
        wh.events = body.events
    if body.enabled is not None:
        wh.enabled = body.enabled
    if body.secret is not None:
        wh.secret = body.secret
    await db.flush()
    await db.refresh(wh)
    return WebhookResponse.model_validate(wh)


@router.delete("/webhooks/{webhook_id}", status_code=204)
async def delete_webhook(
    webhook_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除 Webhook."""
    result = await db.execute(
        select(WebhookModel).where(
            WebhookModel.id == webhook_id,
            WebhookModel.user_id == user.id,
        )
    )
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook 不存在")
    await db.delete(wh)
    await db.flush()


# ─── 事件广播与 Webhook 触发 ───


async def _broadcast_note_event(
    event_type: str,
    note_id: uuid.UUID,
    user_id: uuid.UUID,
    data: dict | None = None,
) -> None:
    """向 SSE 订阅者广播事件 + 异步触发 Webhook."""
    payload = {
        "event": event_type,
        "note_id": str(note_id),
        "user_id": str(user_id),
        "data": data or {},
    }
    # SSE 推送
    queues = _sse_subscribers.get(user_id, [])
    for q in queues:
        await q.put(payload)
    # Webhook 触发 (fire-and-forget)
    asyncio.ensure_future(_trigger_webhooks(event_type, note_id, user_id, data or {}))


async def _trigger_webhooks(
    event_type: str,
    note_id: uuid.UUID,
    user_id: uuid.UUID,
    data: dict,
) -> None:
    """异步触发用户启用的 Webhook."""
    from app.database import async_session_factory

    async with async_session_factory() as db:
        try:
            result = await db.execute(
                select(WebhookModel).where(
                    WebhookModel.user_id == user_id,
                    WebhookModel.enabled == True,
                    WebhookModel.events.any(event_type),
                )
            )
            webhooks = result.scalars().all()
        except Exception:
            logger.exception("获取 Webhook 配置失败")
            return

    import httpx

    payload = json.dumps({
        "event": event_type,
        "note_id": str(note_id),
        "user_id": str(user_id),
        "data": data,
    }, ensure_ascii=False)

    async with httpx.AsyncClient(timeout=10) as client:
        for wh in webhooks:
            headers = {"Content-Type": "application/json"}
            if wh.secret:
                sig = hmac.new(
                    wh.secret.encode(),
                    payload.encode(),
                    hashlib.sha256,
                ).hexdigest()
                headers["X-Webhook-Signature"] = sig
            try:
                await client.post(wh.url, content=payload, headers=headers)
                logger.info("Webhook %s → %s 触发成功", wh.id, wh.url)
            except Exception:
                logger.exception("Webhook %s → %s 触发失败", wh.id, wh.url)


# ─── 内部辅助 ───


async def _upsert_tag_count(
    tag_name: str, user_id: uuid.UUID, db: AsyncSession, delta: int = 1
) -> None:
    result = await db.execute(
        select(NoteTagModel).where(
            NoteTagModel.name == tag_name, NoteTagModel.user_id == user_id,
        )
    )
    tag_row = result.scalar_one_or_none()
    if tag_row:
        tag_row.note_count = max(0, tag_row.note_count + delta)
    elif delta > 0:
        db.add(NoteTagModel(name=tag_name, user_id=user_id, note_count=1))
    await db.flush()


async def _get_reactions_for_note(
    db: AsyncSession, note_id: uuid.UUID, current_user_id: uuid.UUID
) -> list[NoteReactionResponse]:
    from collections import Counter
    result = await db.execute(
        select(NoteReactionModel).where(NoteReactionModel.note_id == note_id)
    )
    rows = result.scalars().all()
    emoji_counts = Counter(r.emoji for r in rows)
    user_emojis = {r.emoji for r in rows if r.user_id == current_user_id}
    return [NoteReactionResponse(emoji=e, count=c, reacted=e in user_emojis) for e, c in sorted(emoji_counts.items())]


async def _batch_get_reactions(
    db: AsyncSession, note_ids: list[uuid.UUID], current_user_id: uuid.UUID
) -> dict[uuid.UUID, list[NoteReactionResponse]]:
    from collections import defaultdict, Counter
    if not note_ids:
        return {}
    result = await db.execute(
        select(NoteReactionModel).where(NoteReactionModel.note_id.in_(note_ids))
    )
    rows = result.scalars().all()
    by_note: dict[uuid.UUID, list[NoteReactionModel]] = defaultdict(list)
    for r in rows:
        by_note[r.note_id].append(r)
    result_map: dict[uuid.UUID, list[NoteReactionResponse]] = {}
    for nid in note_ids:
        note_reactions = by_note.get(nid, [])
        emoji_counts = Counter(r.emoji for r in note_reactions)
        user_emojis = {r.emoji for r in note_reactions if r.user_id == current_user_id}
        result_map[nid] = [NoteReactionResponse(emoji=e, count=c, reacted=e in user_emojis) for e, c in sorted(emoji_counts.items())]
    return result_map


def _note_with_reactions(
    note: NoteModel, reactions: list[NoteReactionResponse]
) -> NoteResponseWithReactions:
    props = extract_note_properties(note.content)
    return NoteResponseWithReactions(
        id=note.id, user_id=note.user_id, content=note.content,
        visibility=note.visibility, pinned=note.pinned, parent_id=note.parent_id,
        row_status=note.row_status, tags=note.tags,
        created_at=note.created_at, updated_at=note.updated_at,
        reactions=reactions, property=props,
    )


def _attachment_to_response(att: NoteAttachmentModel) -> NoteAttachmentResponse:
    return NoteAttachmentResponse(
        id=str(att.id), note_id=str(att.note_id), filename=att.filename,
        size=att.size, mime_type=att.mime_type,
        created_at=att.created_at.isoformat() if att.created_at else None,
        url=f"/api/files/{att.id}",
    )
