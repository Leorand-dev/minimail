"""
Minimail — 系统文档服务

将 docs/ 目录下的 Markdown 文档转换为 HTML 供前端渲染。
"""

from __future__ import annotations

from pathlib import Path

import markdown as md_lib
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/api/system-docs", tags=["docs"])

# docs/ 目录: 相对于项目根目录 (backend/ 的上级)
DOCS_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "docs"

HTML_TEMPLATE = """\
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px; line-height: 1.7; color: #1f2937; padding: 32px 40px;
  max-width: 880px; margin: 0 auto; background: #fff;
}}
h1 {{ font-size: 1.75rem; font-weight: 700; margin: 1.2em 0 0.5em; color: #111827; }}
h2 {{ font-size: 1.35rem; font-weight: 600; margin: 1.1em 0 0.4em; color: #1f2937;
      padding-bottom: 0.25em; border-bottom: 1px solid #e5e7eb; }}
h3 {{ font-size: 1.1rem; font-weight: 600; margin: 0.9em 0 0.3em; color: #374151; }}
p  {{ margin: 0.5em 0; }}
a  {{ color: #066da5; text-decoration: none; }}
a:hover {{ text-decoration: underline; }}
ul, ol {{ margin: 0.5em 0; padding-left: 1.5em; }}
li {{ margin: 0.25em 0; }}
code {{
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 0.9em; padding: 0.15em 0.4em; background: #f3f4f6;
  border-radius: 3px; color: #be185d;
}}
pre {{
  background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px;
  padding: 16px; overflow-x: auto; margin: 0.75em 0;
}}
pre code {{ background: none; padding: 0; color: inherit; }}
blockquote {{
  border-left: 3px solid #066da5; padding: 0.5em 1em; margin: 0.75em 0;
  background: #f0f7ff; color: #4b5563;
}}
table {{
  width: 100%; border-collapse: collapse; margin: 0.75em 0;
  font-size: 0.9em;
}}
th, td {{ padding: 8px 12px; border: 1px solid #e5e7eb; text-align: left; }}
th {{ background: #f9fafb; font-weight: 600; }}
tr:nth-child(even) {{ background: #fafafa; }}
img {{ max-width: 100%; border-radius: 4px; }}
hr {{ border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }}
</style>
</head>
<body>
{content}
</body>
</html>
"""


@router.get("/{path:path}", response_class=HTMLResponse)
async def get_doc(
    path: str,
):
    """获取系统文档 HTML 内容."""
    # 安全检查
    if ".." in path or path.startswith("/"):
        raise HTTPException(status_code=400, detail="Invalid path")

    # 支持 .md 和 .html 扩展
    file_path = (DOCS_ROOT / path).resolve()
    if not file_path.exists():
        # 尝试加 .md 后缀
        file_path = (DOCS_ROOT / path).with_suffix(".md").resolve()

    if not str(file_path).startswith(str(DOCS_ROOT.resolve())):
        raise HTTPException(status_code=403, detail="Forbidden")
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Document not found")

    raw = file_path.read_text(encoding="utf-8")

    # Markdown → HTML (支持表格、代码块、围栏)
    body = md_lib.markdown(
        raw,
        extensions=["fenced_code", "tables", "codehilite", "nl2br"],
    )

    html = HTML_TEMPLATE.format(content=body)
    return HTMLResponse(content=html)
