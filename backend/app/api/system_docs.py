"""
Minimail — 系统文档服务

提供 docs/ 目录下的 Markdown 文档供前端渲染。
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse

router = APIRouter(prefix="/system-docs", tags=["docs"])

# docs/ 目录: 相对于项目根目录 (backend/ 的上级)
DOCS_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "docs"


@router.get("/{path:path}", response_class=PlainTextResponse)
async def get_doc(path: str):
    """获取系统文档 Markdown 内容."""
    # 安全检查: 禁止穿越
    if ".." in path or path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")

    file_path = (DOCS_ROOT / path).resolve()

    # 必须在 docs/ 目录内
    if not str(file_path).startswith(str(DOCS_ROOT.resolve())):
        raise HTTPException(status_code=403, detail="Forbidden")

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Document not found")

    content = file_path.read_text(encoding="utf-8")
    return content
