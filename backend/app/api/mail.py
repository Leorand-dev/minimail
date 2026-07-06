"""
Webmail — 邮件 API 路由
"""

from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.imap import (
    list_folders as imap_list_folders,
    fetch_messages as imap_fetch_messages,
    fetch_message_detail as imap_fetch_detail,
    search_messages as imap_search,
    fetch_attachment as imap_fetch_attachment,
    mark_as_read,
    mark_as_unread,
    move_message,
    copy_message,
    delete_message,
    create_folder,
    delete_folder,
    close_connection,
)
from app.imap.connection import get_connection, update_sync_time, update_sync_time
from app.imap.types import Folder, MessageDetail, MessageSummary
from app.models.user import User
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/mail", tags=["mail"])


async def _get_user_imap_config(
    user: User,
    db: AsyncSession | None = None,
    account_id: uuid.UUID | None = None,
) -> dict:
    """获取用户的 IMAP 连接配置, 支持多账户."""
    # 优先用指定账户
    if account_id and db:
        from app.services.email_account import get_account
        acc = await get_account(db, account_id, user.id)
        if acc and acc.imap_host:
            from app.services.email_account import _decrypt_password
            return {
                "host": acc.imap_host,
                "port": acc.imap_port,
                "ssl": acc.imap_ssl,
                "username": acc.imap_username or acc.email,
                "password": _decrypt_password(acc.imap_password_enc) if acc.imap_password_enc else "",
            }

    # 用默认账户
    if db:
        from app.services.email_account import get_default_account, _decrypt_password
        acc = await get_default_account(db, user.id)
        if acc and acc.imap_host:
            return {
                "host": acc.imap_host,
                "port": acc.imap_port,
                "ssl": acc.imap_ssl,
                "username": acc.imap_username or acc.email,
                "password": _decrypt_password(acc.imap_password_enc) if acc.imap_password_enc else "",
            }

    # 回退到旧配置 (User 表字段)
    if not user.imap_host:
        domain = user.email.split("@")[-1]
        return {
            "host": f"imap.{domain}",
            "port": user.imap_port,
            "ssl": user.imap_ssl,
            "username": user.imap_username or user.email,
            "password": user.imap_password_enc or "",
        }
    return {
        "host": user.imap_host,
        "port": user.imap_port,
        "ssl": user.imap_ssl,
        "username": user.imap_username or user.email,
        "password": user.imap_password_enc or "",
    }


# ══════════════════════════════════════════
# 文件夹
# ══════════════════════════════════════════


@router.get("/folders")
async def get_folders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Folder]:
    """获取用户邮箱的所有文件夹."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    folders = await imap_list_folders(imap)
    return folders


@router.get("/account-folders/{account_id}", summary="获取指定账户的文件夹")
async def get_account_folders(
    account_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取指定邮箱账户的文件夹列表."""
    from app.services.email_account import get_account
    acc = await get_account(db, account_id, user.id)
    if not acc or not acc.imap_host:
        raise HTTPException(status_code=404, detail="账户未找到或未配置")
    
    cfg = await _get_user_imap_config(user, db, account_id)
    try:
        imap = await get_connection(
            user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
        )
        folders = await imap_list_folders(imap)
    except:
        folders = []
    
    return {
        "account_id": str(account_id),
        "account_email": acc.email,
        "account_name": acc.name or acc.email.split("@")[0],
        "folders": [f.model_dump() for f in folders],
    }


@router.post("/folders", summary="创建文件夹")
async def create_folder_route(
    name: str = Query(..., description="文件夹名称"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新文件夹."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    ok = await create_folder(imap, name)
    if not ok:
        raise HTTPException(status_code=400, detail="创建文件夹失败")
    return {"status": "ok"}


@router.delete("/folders", summary="删除文件夹")
async def delete_folder_route(
    name: str = Query(..., description="要删除的文件夹名称"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除文件夹."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    ok = await delete_folder(imap, name)
    if not ok:
        raise HTTPException(status_code=400, detail="删除文件夹失败")
    return {"status": "ok"}


# ══════════════════════════════════════════
# 邮件列表
# ══════════════════════════════════════════


@router.get("/messages")
async def get_messages(
    folder: str = Query("INBOX", description="邮箱文件夹"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    sort_field: str = Query("date"),
    sort_order: str = Query("DESC", pattern="^(ASC|DESC)$"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """获取邮件列表."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    messages, total = await imap_fetch_messages(
        imap, folder=folder, page=page, page_size=page_size,
        sort_field=sort_field, sort_order=sort_order,
    )

    return {
        "messages": [m.model_dump() for m in messages],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/messages/search", summary="搜索邮件")
async def search_messages_route(
    folder: str = Query("INBOX"),
    query: str = Query("", description="搜索关键词"),
    date_from: str | None = Query(None, description="起始日期 (DD-Mon-YYYY, 如 01-Jul-2026)"),
    date_to: str | None = Query(None, description="截止日期 (DD-Mon-YYYY, 如 31-Jul-2026)"),
    unread_only: bool = Query(False, description="仅未读"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """搜索邮件 (支持关键词 + 日期范围 + 未读筛选)."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    messages, total = await imap_search(
        imap, folder=folder, query=query,
        date_from=date_from, date_to=date_to, unread_only=unread_only,
        page=page, page_size=page_size,
    )

    return {
        "messages": [m.model_dump() for m in messages],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/messages/{uid}")
async def get_message(
    folder: str = Query("INBOX"),
    uid: int = Path(..., description="邮件 UID", ge=1),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageDetail:
    """获取邮件完整内容."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    detail = await imap_fetch_detail(imap, folder, uid)
    if not detail:
        raise HTTPException(status_code=404, detail="邮件未找到")
    await mark_as_read(imap, folder, uid)
    return detail


# ══════════════════════════════════════════
# 邮件操作
# ══════════════════════════════════════════


@router.post("/messages/{uid}/read")
async def mark_read(
    folder: str = Query("INBOX", description="邮箱文件夹"),
    uid: int = Path(..., description="邮件 UID"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """标记邮件为已读."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    ok = await mark_as_read(imap, folder, uid)
    return {"status": "ok" if ok else "failed"}


@router.post("/messages/{uid}/unread")
async def mark_unread(
    folder: str = Query("INBOX", description="邮箱文件夹"),
    uid: int = Path(..., description="邮件 UID"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """标记邮件为未读."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    ok = await mark_as_unread(imap, folder, uid)
    return {"status": "ok" if ok else "failed"}


@router.post("/messages/{uid}/move")
async def move(
    folder: str = Query(..., description="源文件夹"),
    uid: int = Path(..., description="邮件 UID"),
    target: str = Query(..., description="目标文件夹"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """移动邮件."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    ok = await move_message(imap, folder, uid, target)
    return {"status": "ok" if ok else "failed"}


@router.post("/messages/{uid}/delete", summary="删除邮件")
async def delete(
    folder: str = Query("INBOX", description="邮箱文件夹"),
    uid: int = Path(..., description="邮件 UID"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除邮件."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    ok = await delete_message(imap, folder, uid)
    return {"status": "ok" if ok else "failed"}


# ══════════════════════════════════════════
# 附件下载
# ══════════════════════════════════════════


@router.get("/status", summary="IMAP 连接状态")
async def imap_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的 IMAP 连接状态和最后同步时间."""
    from app.imap.connection import get_connection_info
    cfg = await _get_user_imap_config(user, db)
    info = get_connection_info(user.id)
    return {
        "connected": info.get("connected", False),
        "last_sync": info.get("last_sync"),
        "host": cfg["host"],
    }


@router.get("/messages/{uid}/attachment/{part_id}", summary="下载附件")
async def download_attachment(
    folder: str = Query("INBOX", description="邮箱文件夹"),
    uid: int = Path(..., ge=1, description="邮件 UID"),
    part_id: str = Path(..., description="附件 Part ID (MIME)"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """下载邮件附件."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    raw = await imap_fetch_attachment(imap, folder, uid, part_id)
    if not raw:
        raise HTTPException(status_code=404, detail="附件未找到")

    import mimetypes
    mt, _ = mimetypes.guess_type(part_id)
    media_type = mt or "application/octet-stream"

    return Response(
        content=raw,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{part_id}"',
            "Content-Length": str(len(raw)),
        },
    )


# ══════════════════════════════════════════
# 发送邮件
# ══════════════════════════════════════════

@router.get("/demo", summary="获取示例邮件数据 (用于展示)")
async def get_demo_data(
    user: User = Depends(get_current_user),
):
    """
    返回示例邮件数据, 当 IMAP 无邮件或连接失败时用于演示 UI。
    包含示例文件夹、邮件列表和详细内容。
    """
    from datetime import datetime, timezone, timedelta
    now = datetime.now(timezone.utc)
    folders = [
        {"name": "INBOX", "delim": "/", "flags": ["\\HasNoChildren"], "subscribed": True, "exists": 5, "unseen": 2, "recent": 1, "hierarchy": ["INBOX"], "is_container": False},
        {"name": "Sent", "delim": "/", "flags": ["\\HasNoChildren"], "subscribed": True, "exists": 12, "unseen": 0, "recent": 0, "hierarchy": ["Sent"], "is_container": False},
        {"name": "Drafts", "delim": "/", "flags": ["\\HasNoChildren"], "subscribed": True, "exists": 1, "unseen": 0, "recent": 0, "hierarchy": ["Drafts"], "is_container": False},
        {"name": "Junk", "delim": "/", "flags": ["\\HasNoChildren"], "subscribed": True, "exists": 3, "unseen": 3, "recent": 0, "hierarchy": ["Junk"], "is_container": False},
        {"name": "Trash", "delim": "/", "flags": ["\\HasNoChildren"], "subscribed": True, "exists": 0, "unseen": 0, "recent": 0, "hierarchy": ["Trash"], "is_container": False},
        {"name": "Archive", "delim": "/", "flags": ["\\HasNoChildren"], "subscribed": True, "exists": 8, "unseen": 0, "recent": 0, "hierarchy": ["Archive"], "is_container": False},
        {"name": "工作", "delim": "/", "flags": ["\\HasNoChildren"], "subscribed": True, "exists": 15, "unseen": 4, "recent": 0, "hierarchy": ["工作"], "is_container": False},
    ]

    msgs = [
        {
            "uid": 101, "seq": 1, "flags": [], "size": 18640,
            "date": (now - timedelta(minutes=5)).isoformat(),
            "subject": "🎉 欢迎使用 Minimail — 您的智能邮件系统！",
            "from_": {"name": "Minimail Team", "email": "welcome@minimail.app"},
            "to": [{"name": "Demo User", "email": "demo@example.com"}],
            "has_attachments": False, "preview": "欢迎使用 Minimail！这是一封系统欢迎信，帮助您快速了解各项功能。",
            "is_read": False,
        },
        {
            "uid": 102, "seq": 2, "flags": ["\\Seen"], "size": 2240,
            "date": (now - timedelta(hours=24)).isoformat(),
            "subject": "📖 快速开始指南",
            "from_": {"name": "Minimail Team", "email": "welcome@minimail.app"},
            "to": [{"name": "Demo User", "email": "demo@example.com"}],
            "has_attachments": True, "preview": "目录: 1. 添加邮箱账户 2. 收发邮件 3. 管理通讯录 4. 使用 API 密钥 5. 个性化设置",
            "is_read": True,
        },
        {
            "uid": 103, "seq": 3, "flags": ["\\Flagged", "\\Seen"], "size": 3920,
            "date": (now - timedelta(hours=48)).isoformat(),
            "subject": "🔗 开源社区与贡献指南",
            "from_": {"name": "Minimail Team", "email": "welcome@minimail.app"},
            "to": [{"name": "Demo User", "email": "demo@example.com"}],
            "has_attachments": False, "preview": "Minimail 是一款开源邮件客户端，我们欢迎社区贡献。GitHub: github.com/Leorand-dev/minimail",
            "is_read": True,
        },
        {
            "uid": 104, "seq": 4, "flags": [], "size": 5150,
            "date": (now - timedelta(hours=72)).isoformat(),
            "subject": "💡 小贴士: AI Agent 集成",
            "from_": {"name": "Minimail Team", "email": "welcome@minimail.app"},
            "to": [{"name": "Demo User", "email": "demo@example.com"}],
            "has_attachments": False, "preview": "Minimail 支持通过 API 密钥与 AI Agent 集成。您可以在设置页面生成 API 密钥，实现自动化工作流。",
            "is_read": False,
        },
        {
            "uid": 105, "seq": 5, "flags": [], "size": 1200,
            "date": (now - timedelta(hours=96)).isoformat(),
            "subject": "🆕 更新日志: v0.12 已发布",
            "from_": {"name": "Minimail Team", "email": "welcome@minimail.app"},
            "to": [{"name": "Demo User", "email": "demo@example.com"}],
            "has_attachments": False, "preview": "新版本特性: IMAP 状态指示器、富文本编辑器、搜索增强、UI 优化、性能改进",
            "is_read": False,
        },
    ]

    details = {
        101: {
            "uid": 101, "seq": 1, "flags": [], "size": 18640,
            "date": (now - timedelta(minutes=5)).isoformat(),
            "subject": "🎉 欢迎使用 Minimail — 您的智能邮件系统！",
            "from_": {"name": "Minimail Team", "email": "welcome@minimail.app"},
            "to": [{"name": "Demo User", "email": "demo@example.com"}],
            "cc": [], "bcc": [], "reply_to": [],
            "message_id": "<welcome@minimail.app>",
            "in_reply_to": "",
            "references": [],
            "text_plain": """欢迎使用 Minimail！🎉

感谢您选择 Minimail 作为您的邮件客户端。Minimail 是一款开源、现代化、支持 AI Agent 集成的智能邮件系统。

项目地址: https://github.com/Leorand-dev/minimail

📋 核心功能:
━━━━━━━━━━━━━━━━━━━━━━━
• 📧 多邮箱账户 — 同时管理多个邮箱
• 🔍 搜索增强 — 关键词 + 日期范围 + 未读筛选
• ✏️ 富文本编辑器 — 格式化邮件撰写
• 📇 通讯录管理 — 分组 + 自动完成
• 🔑 API 密钥管理 — AI Agent 集成
• 🎨 个性化设置 — 多语言/主题/每页条数
━━━━━━━━━━━━━━━━━━━━━━━

💡 快速上手:
  1. 前往「设置」→ 添加您的邮箱账户
  2. 配置 IMAP/SMTP 参数（或使用自动检测）
  3. 回到收件箱查看邮件
  4. 点击「写邮件」开始发送

🤖 AI Agent 集成:
  Minimail 提供完整的 REST API，支持通过 API 密钥进行 AI Agent 调用。
  详见: 侧栏「API 文档」→「API 密钥」页面

📚 更多资源:
  • GitHub: https://github.com/Leorand-dev/minimail
  • 文档: 侧栏「API 文档」
  • 反馈: 提交 GitHub Issue

祝您使用愉快！
—— Minimail Team ✨""",
            "text_html": "",
            "attachments": [],
            "inline_images": [],
            "priority": 0,
            "has_attachments": False,
            "is_read": False,
        },
        102: {
            "uid": 102, "seq": 2, "flags": ["\\Seen"], "size": 2240,
            "date": (now - timedelta(hours=24)).isoformat(),
            "subject": "📖 快速开始指南",
            "from_": {"name": "Minimail Team", "email": "welcome@minimail.app"},
            "to": [{"name": "Demo User", "email": "demo@example.com"}],
            "cc": [], "bcc": [], "reply_to": [],
            "message_id": "<guide@minimail.app>",
            "in_reply_to": "",
            "references": [],
            "text_plain": """Minimail 快速开始指南

目录:
1. 添加邮箱账户
   打开侧栏「设置」→「邮箱账户」→ 填写 IMAP/SMTP 参数
   支持主流邮箱 (Gmail/Outlook/QQ/163 等)

2. 收发邮件
   • 收件箱自动同步文件夹列表
   • 点击邮件预览详情
   • 回复/全部回复/转发一键操作
   • 拖放或点击附件下载

3. 管理通讯录
   • 侧栏「通讯录」→ 新建联系人/分组
   • 撰写邮件时自动完成收件人

4. 使用 API 密钥
   • 侧栏「API 密钥」→ 创建密钥
   • 用于外部 AI Agent 调用 Minimail API
   • 支持 read / read,write / admin 三种权限范围

5. 个性化设置
   • 每页显示条数 (20/50/100)
   • 预览面板开关
   • 主题色 (亮色/暗色)

更多帮助请访问 GitHub: https://github.com/Leorand-dev/minimail""",
            "text_html": "",
            "attachments": [{"filename": "minimail-quickstart.pdf", "mimetype": "application/pdf", "size": 128000, "part_id": "1.1"}],
            "inline_images": [],
            "priority": 0,
            "has_attachments": True,
            "is_read": True,
        },
        103: {
            "uid": 103, "seq": 3, "flags": ["\\Flagged", "\\Seen"], "size": 3920,
            "date": (now - timedelta(hours=48)).isoformat(),
            "subject": "🔗 开源社区与贡献指南",
            "from_": {"name": "Minimail Team", "email": "welcome@minimail.app"},
            "to": [{"name": "Demo User", "email": "demo@example.com"}],
            "cc": [], "bcc": [], "reply_to": [],
            "message_id": "<community@minimail.app>",
            "in_reply_to": "",
            "references": [],
            "text_plain": """Minimail 开源社区与贡献指南

Minimail 是一款开源软件，我们欢迎任何形式的贡献！

🔗 GitHub 仓库:
  https://github.com/Leorand-dev/minimail

🌟 如何贡献:
  1. Star 仓库 ⭐ — 这是最大的支持！
  2. 提交 Issue — 报告 bug 或提出功能建议
  3. Pull Request — 代码贡献
  4. 文档改进 — 完善 Wiki 和注释

🛠️ 技术栈:
  • 后端: Python FastAPI + SQLAlchemy 2.0 + PostgreSQL
  • 前端: React 19 + TypeScript + Vite + Tailwind CSS 4
  • 邮件协议: aioimaplib + aiosmtplib
  • AI: OpenAI API 兼容接口 + MCP 协议

📜 开源协议: MIT License

欢迎加入我们的社区！""",
            "text_html": "",
            "attachments": [],
            "inline_images": [],
            "priority": 0,
            "has_attachments": False,
            "is_read": True,
        },
        104: {
            "uid": 104, "seq": 4, "flags": [], "size": 5150,
            "date": (now - timedelta(hours=72)).isoformat(),
            "subject": "💡 小贴士: AI Agent 集成",
            "from_": {"name": "Minimail Team", "email": "welcome@minimail.app"},
            "to": [{"name": "Demo User", "email": "demo@example.com"}],
            "cc": [], "bcc": [], "reply_to": [],
            "message_id": "<ai-tips@minimail.app>",
            "in_reply_to": "",
            "references": [],
            "text_plain": """💡 AI Agent 集成小贴士

Minimail 提供完整的 REST API，支持通过 API 密钥与 AI Agent 集成。

🔑 生成 API 密钥:
  侧栏 → 「API 密钥」→ 创建密钥
  选择权限范围并设置过期时间

🤖 Agent 调用示例:
  curl -H "Authorization: Bearer <你的令牌>" \
       http://你的服务器地址/api/mail/folders

📡 支持的接口:
  • GET /api/mail/folders — 获取文件夹列表
  • GET /api/mail/messages — 获取邮件列表
  • POST /api/mail/send — 发送邮件
  • GET /api/contacts — 通讯录查询
  • 更多详见侧栏「API 文档」

🚀 应用场景:
  • 自动化邮件处理工作流
  • 智能邮件分类与回复
  • 日程助理与任务管理
  • 数据提取与分析

在设置页面的「API 密钥」面板查看详细的调用示例。""",
            "text_html": "",
            "attachments": [],
            "inline_images": [],
            "priority": 0,
            "has_attachments": False,
            "is_read": False,
        },
        105: {
            "uid": 105, "seq": 5, "flags": [], "size": 1200,
            "date": (now - timedelta(hours=96)).isoformat(),
            "subject": "🆕 更新日志: v0.12 已发布",
            "from_": {"name": "Minimail Team", "email": "welcome@minimail.app"},
            "to": [{"name": "Demo User", "email": "demo@example.com"}],
            "cc": [], "bcc": [], "reply_to": [],
            "message_id": "<changelog@minimail.app>",
            "in_reply_to": "",
            "references": [],
            "text_plain": """Minimail v0.12 更新日志
━━━━━━━━━━━━━━━━━━

✨ 新功能:
  • IMAP 状态指示器 — 侧栏底部连接状态 + 同步时间
  • 富文本编辑器 — TipTap 工具栏 + HTML 双版发送
  • 搜索增强 — 日期范围 + 未读筛选 + 关键词高亮

🖌️ UI 优化:
  • 骨架屏加载态 (邮件列表 / 预览 / 文件夹)
  • 邮件行首字母头像 + 选中边栏
  • 搜索无结果 / 空收件箱差异化提示
  • 逐行淡入动画

🔧 修复:
  • API 路径双 /api/ 前缀问题 (34 处)
  • 用户名直接登录支持
  • 个人信息更新用户名

📄 文档:
  • 侧栏 API 文档入口
  • 完整 API 审计 (34 路由 + 参数描述)

GitHub: https://github.com/Leorand-dev/minimail
Changelog: https://github.com/Leorand-dev/minimail/blob/main/CHANGELOG.md""",
            "text_html": "",
            "attachments": [],
            "inline_images": [],
            "priority": 0,
            "has_attachments": False,
            "is_read": False,
        },
    }

    return {
        "folders": folders,
        "details": details,
        "messages": {
            "messages": msgs,
            "total": len(msgs),
            "page": 1,
            "page_size": 50,
            "total_pages": 1,
        },
    }


class SendRequest(BaseModel):
    to: list[str]
    cc: list[str] | None = None
    bcc: list[str] | None = None
    subject: str = ""
    text_body: str = ""
    html_body: str = ""
    reply_to: str | None = None
    in_reply_to: str | None = None
    from_addr: str | None = None


@router.post("/send", status_code=status.HTTP_200_OK)
async def send_mail(
    body: SendRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """发送邮件 (通过用户 SMTP 配置)."""
    from app.services.smtp_service import send_email
    from app.services.email_account import get_default_account, _decrypt_password

    if not body.to:
        raise HTTPException(status_code=400, detail="收件人不能为空")

    # 解析 SMTP 配置: 优先用默认账户
    smtp_host = user.smtp_host
    smtp_port = user.smtp_port
    smtp_ssl = user.smtp_ssl
    smtp_username = user.smtp_username or user.email
    smtp_password = user.smtp_password_enc or ""

    acc = await get_default_account(db, user.id)
    if acc and acc.smtp_host:
        smtp_host = acc.smtp_host
        smtp_port = acc.smtp_port
        smtp_ssl = acc.smtp_ssl
        smtp_username = acc.smtp_username or acc.email
        smtp_password = _decrypt_password(acc.smtp_password_enc) if acc.smtp_password_enc else ""

    try:
        result = await send_email(
            user=user,
            from_addr=body.from_addr or user.email,
            to_addrs=body.to,
            subject=body.subject,
            text_body=body.text_body,
            html_body=body.html_body,
            cc=body.cc,
            bcc=body.bcc,
            reply_to=body.reply_to,
            in_reply_to=body.in_reply_to,
            # Override SMTP config
            _smtp_host=smtp_host,
            _smtp_port=smtp_port,
            _smtp_ssl=smtp_ssl,
            _smtp_username=smtp_username,
            _smtp_password=smtp_password,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
