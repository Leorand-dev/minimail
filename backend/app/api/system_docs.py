"""
Minimail — 系统文档服务

将 docs/ 目录下的 Markdown 文档转换为 HTML 供前端渲染。
"""

from __future__ import annotations

from pathlib import Path

import markdown as md_lib
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/api/system-docs", tags=["docs"])

# docs/ 目录: 相对于项目根目录 (backend/ 的上级)
DOCS_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "docs"

# 内联样式: 独立注入, 不包裹 <html>/<body>
STYLE = """
<style>
.doc-body { font-size: 14px; line-height: 1.7; color: #1f2937; }
.doc-body h1 { font-size: 1.75rem; font-weight: 700; margin: 1.2em 0 0.5em; color: #111827; }
.doc-body h2 { font-size: 1.35rem; font-weight: 600; margin: 1.1em 0 0.4em; color: #1f2937; padding-bottom: 0.25em; border-bottom: 1px solid #e5e7eb; }
.doc-body h3 { font-size: 1.1rem; font-weight: 600; margin: 0.9em 0 0.3em; color: #374151; }
.doc-body h4 { font-size: 1rem; font-weight: 600; margin: 0.7em 0 0.3em; color: #374151; }
.doc-body p  { margin: 0.5em 0; }
.doc-body a  { color: #066da5; text-decoration: none; }
.doc-body a:hover { text-decoration: underline; }
.doc-body ul, .doc-body ol { margin: 0.5em 0; padding-left: 1.5em; }
.doc-body li { margin: 0.25em 0; }
.doc-body code {
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.9em; padding: 0.15em 0.4em; background: #f3f4f6;
  border-radius: 3px; color: #be185d;
}
.doc-body pre {
  background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
  padding: 16px; overflow-x: auto; margin: 0.75em 0;
}
.doc-body pre code { background: none; padding: 0; color: inherit; }
.doc-body blockquote {
  border-left: 3px solid #066da5; padding: 0.5em 1em; margin: 0.75em 0;
  background: #f0f7ff; color: #4b5563;
}
.doc-body table {
  width: 100%; border-collapse: collapse; margin: 0.75em 0;
  font-size: 0.9em;
}
.doc-body th, .doc-body td { padding: 8px 12px; border: 1px solid #e5e7eb; text-align: left; }
.doc-body th { background: #f9fafb; font-weight: 600; }
.doc-body tr:nth-child(even) { background: #fafafa; }
.doc-body img { max-width: 100%; border-radius: 4px; }
.doc-body hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
</style>
"""


@router.get("/{path:path}", response_class=HTMLResponse)
async def get_doc(path: str):
    """获取系统文档 HTML 内容（仅 body 片段 + 内联样式）. """
    # 安全检查
    if ".." in path or path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")

    file_path = (DOCS_ROOT / path).resolve()
    if not file_path.exists():
        file_path = (DOCS_ROOT / path).with_suffix(".md").resolve()

    if not str(file_path).startswith(str(DOCS_ROOT.resolve())):
        raise HTTPException(status_code=403, detail="Forbidden")
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Document not found")

    raw = file_path.read_text(encoding="utf-8")

    body = md_lib.markdown(
        raw,
        extensions=["fenced_code", "tables", "codehilite", "nl2br"],
    )

    return HTMLResponse(
        content=f'{STYLE}<div class="doc-body">{body}</div>'
    )
