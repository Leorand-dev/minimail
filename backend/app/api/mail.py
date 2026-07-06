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
from app.imap.connection import get_connection
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
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """搜索邮件."""
    cfg = await _get_user_imap_config(user, db)
    imap = await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"]
    )
    messages, total = await imap_search(
        imap, folder=folder, query=query, page=page, page_size=page_size,
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
