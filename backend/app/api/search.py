"""
Minimail — 统一搜索

跨邮件 + 笔记库的全文搜索入口.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.note import Note as NoteModel
from app.models.user import User
from app.schemas.note import UnifiedSearchItem, UnifiedSearchResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("", response_model=UnifiedSearchResponse)
async def unified_search(
    q: str = Query("", description="搜索关键词"),
    limit: int = Query(20, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """统一搜索 — 跨邮件 + 笔记的全文搜索.

    搜索范围:
      - 笔记: content 全文 (tsvector)
      - 邮件: (预留, 当前仅返回笔记结果)
    """
    results: list[UnifiedSearchItem] = []
    query = q.strip()
    total = 0

    if not query:
        return UnifiedSearchResponse(results=[], total=0, query="")

    # ── 搜索笔记 ──
    from sqlalchemy import func as sa_func

    note_query = select(NoteModel).where(
        NoteModel.user_id == user.id,
        NoteModel.row_status == "active",
        or_(
            NoteModel.content.ilike(f"%{query}%"),
            NoteModel.tags.any(query),
        ),
    ).order_by(NoteModel.pinned.desc(), NoteModel.created_at.desc()).limit(limit)

    note_result = await db.execute(note_query)
    notes = note_result.scalars().all()

    for note in notes:
        snippet = note.content[:200].replace("\n", " ")
        results.append(
            UnifiedSearchItem(
                id=str(note.id),
                type_="note",
                title=snippet[:80],
                snippet=snippet,
                created_at=note.created_at.isoformat() if note.created_at else None,
                tags=note.tags,
                url="",
            )
        )

    # ── 搜索邮件 (预留: 需要邮件全文索引) ──
    # TODO: add email search when mail messages are indexed

    total = len(results)
    return UnifiedSearchResponse(results=results, total=total, query=query)
