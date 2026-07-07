"""
Minimail — 文件服务路由

提供笔记附件等文件下载.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Path as FastAPIPath
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.note import NoteAttachment as NoteAttachmentModel

router = APIRouter(prefix="/api/files", tags=["files"])


@router.get("/{attachment_id}")
async def download_file(
    attachment_id: uuid.UUID = FastAPIPath(...),
    db: AsyncSession = Depends(get_db),
):
    """下载附件文件."""
    result = await db.execute(
        select(NoteAttachmentModel).where(NoteAttachmentModel.id == attachment_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="文件未找到")
    filepath = Path(att.filepath)
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(str(filepath), filename=att.filename, media_type=att.mime_type)
