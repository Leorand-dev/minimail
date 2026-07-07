"""
Minimail — 公开分享链接查看
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.note import Note, NoteShare
from app.schemas.note import NoteResponse, extract_note_properties

router = APIRouter(prefix="/api/shares", tags=["shares"])


@router.get("/{token}", response_model=NoteResponse)
async def get_shared_note(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    """通过分享 token 获取公开笔记 (无需认证)."""
    result = await db.execute(
        select(NoteShare).where(NoteShare.token == token)
    )
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="分享链接不存在或已失效")

    # 检查过期
    if share.expires_at and share.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="分享链接已过期")

    # 获取笔记
    note_result = await db.execute(
        select(Note).where(
            Note.id == share.note_id,
            Note.row_status == "active",
        )
    )
    note = note_result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="笔记不存在或已删除")

    resp = NoteResponse(
        id=note.id,
        user_id=note.user_id,
        content=note.content,
        visibility=note.visibility,
        pinned=note.pinned,
        parent_id=note.parent_id,
        row_status=note.row_status,
        tags=note.tags,
        created_at=note.created_at,
        updated_at=note.updated_at,
    )
    resp.property = extract_note_properties(note.content)
    return resp
