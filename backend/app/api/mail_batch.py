"""
Minimail — 批量邮件操作 API

支持批量标记已读/未读、删除、移动邮件。
对 demo 用户 (demo@example.com) 直接返回成功。
"""

from __future__ import annotations

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.imap.connection import get_connection
from app.models.user import User
from app.services.auth import get_current_user

logger = logging.getLogger("minimail.mail_batch")

router = APIRouter(prefix="/api/mail/batch", tags=["mail-batch"])


# ── Request Schemas ──


class BatchUidsRequest(BaseModel):
    uids: list[int] = Field(..., min_length=1, description="邮件 UID 列表")
    folder: str = Field(..., description="邮箱文件夹")
    account_id: str | None = None


class BatchMoveRequest(BaseModel):
    uids: list[int] = Field(..., min_length=1, description="邮件 UID 列表")
    from_folder: str = Field(..., description="源文件夹")
    to_folder: str = Field(..., description="目标文件夹")
    account_id: str | None = None


# ── Helpers ──


def _is_demo_user(user: User) -> bool:
    """检查是否为 demo 用户."""
    return user.email == "demo@example.com"


async def _get_imap_config(
    user: User,
    db: AsyncSession,
    account_id: str | None = None,
) -> dict:
    """获取用户的 IMAP 连接配置, 支持多账户."""
    if account_id:
        from app.services.email_account import get_account, _decrypt_password

        try:
            acc_uuid = uuid.UUID(account_id)
            acc = await get_account(db, acc_uuid, user.id)
            if acc and acc.imap_host:
                return {
                    "host": acc.imap_host,
                    "port": acc.imap_port,
                    "ssl": acc.imap_ssl,
                    "username": acc.imap_username or acc.email,
                    "password": _decrypt_password(acc.imap_password_enc) if acc.imap_password_enc else "",
                }
        except Exception:
            pass

    # 默认账户
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

    # 回退到 User 表旧配置
    password = user.imap_password_enc or ""
    if password:
        try:
            from app.services.email_account import _decrypt_password
            password = _decrypt_password(password)
        except Exception:
            pass
    return {
        "host": user.imap_host or f"imap.{user.email.split('@')[-1]}",
        "port": user.imap_port or 993,
        "ssl": user.imap_ssl if user.imap_ssl is not None else True,
        "username": user.imap_username or user.email,
        "password": password,
    }


async def _get_imap(user: User, db: AsyncSession, account_id: str | None = None):
    """获取 IMAP 连接."""
    cfg = await _get_imap_config(user, db, account_id)
    return await get_connection(
        user.id, cfg["host"], cfg["port"], cfg["ssl"], cfg["username"], cfg["password"],
    )


# ── Batch Operations ──


@router.post("/mark-read", summary="批量标记已读")
async def batch_mark_read(
    body: BatchUidsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量标记邮件为已读."""
    if _is_demo_user(user):
        return {"status": "ok", "processed": len(body.uids), "demo": True}

    try:
        imap = await _get_imap(user, db, body.account_id)
        await imap.select(body.folder)
        uid_set = ",".join(str(uid) for uid in body.uids)
        typ, _ = await imap.uid("STORE", uid_set, "+FLAGS", "(\\Seen)")
        if typ != "OK":
            raise HTTPException(status_code=500, detail="批量标记已读失败")
        return {"status": "ok", "processed": len(body.uids)}
    except Exception as e:
        logger.error("批量标记已读失败: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mark-unread", summary="批量标记未读")
async def batch_mark_unread(
    body: BatchUidsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量标记邮件为未读."""
    if _is_demo_user(user):
        return {"status": "ok", "processed": len(body.uids), "demo": True}

    try:
        imap = await _get_imap(user, db, body.account_id)
        await imap.select(body.folder)
        uid_set = ",".join(str(uid) for uid in body.uids)
        typ, _ = await imap.uid("STORE", uid_set, "-FLAGS", "(\\Seen)")
        if typ != "OK":
            raise HTTPException(status_code=500, detail="批量标记未读失败")
        return {"status": "ok", "processed": len(body.uids)}
    except Exception as e:
        logger.error("批量标记未读失败: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete", summary="批量删除邮件")
async def batch_delete(
    body: BatchUidsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量删除邮件 (标记 Deleted + EXPUNGE)."""
    if _is_demo_user(user):
        return {"status": "ok", "processed": len(body.uids), "demo": True}

    try:
        imap = await _get_imap(user, db, body.account_id)
        await imap.select(body.folder)
        uid_set = ",".join(str(uid) for uid in body.uids)
        typ, _ = await imap.uid("STORE", uid_set, "+FLAGS", "(\\Deleted)")
        if typ != "OK":
            raise HTTPException(status_code=500, detail="批量删除失败")
        await imap.expunge()
        return {"status": "ok", "processed": len(body.uids)}
    except Exception as e:
        logger.error("批量删除失败: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/move", summary="批量移动邮件")
async def batch_move(
    body: BatchMoveRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量移动邮件到其他文件夹."""
    if _is_demo_user(user):
        return {"status": "ok", "processed": len(body.uids), "demo": True}

    try:
        imap = await _get_imap(user, db, body.account_id)
        await imap.select(body.from_folder)
        uid_set = ",".join(str(uid) for uid in body.uids)
        typ, _ = await imap.uid("MOVE", uid_set, body.to_folder)
        if typ != "OK":
            raise HTTPException(status_code=500, detail="批量移动失败")
        return {"status": "ok", "processed": len(body.uids)}
    except Exception as e:
        logger.error("批量移动失败: %s", e)
        raise HTTPException(status_code=500, detail=str(e))