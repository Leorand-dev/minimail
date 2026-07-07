"""
Webmail — 设置 API (IMAP/SMTP 配置 CRUD)
"""

from __future__ import annotations

import base64
import logging

from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.services.auth import get_current_user
from app.models.user import User
from app.schemas.note import NoteSettingsResponse

logger = logging.getLogger("webmail.settings")

router = APIRouter(prefix="/api/settings", tags=["settings"])


# ── Schemas ──


class ImapConfig(BaseModel):
    host: str = ""
    port: int = 993
    ssl: bool = True
    username: str = ""
    password: str = ""


class SmtpConfig(BaseModel):
    host: str = ""
    port: int = 465
    ssl: bool = True
    username: str = ""
    password: str = ""


class MailSettingsResponse(BaseModel):
    imap: ImapConfig
    smtp: SmtpConfig
    configured: bool


class MailSettingsUpdate(BaseModel):
    imap: ImapConfig
    smtp: SmtpConfig


# ── Helpers ──


def _encrypt_password(plain: str) -> str:
    """使用 Fernet 加密密码."""
    if not plain:
        return ""
    cipher = Fernet(settings.encryption_key.encode())
    return base64.urlsafe_b64encode(cipher.encrypt(plain.encode())).decode()


def _masked_config(user: User) -> MailSettingsResponse:
    """返回设置时隐藏密码."""
    has_pwd = bool(user.imap_password_enc or user.smtp_password_enc)
    return MailSettingsResponse(
        imap=ImapConfig(
            host=user.imap_host or "",
            port=user.imap_port or 993,
            ssl=user.imap_ssl if user.imap_ssl is not None else True,
            username=user.imap_username or "",
            password="••••••••" if user.imap_password_enc else "",
        ),
        smtp=SmtpConfig(
            host=user.smtp_host or "",
            port=user.smtp_port or 465,
            ssl=user.smtp_ssl if user.smtp_ssl is not None else True,
            username=user.smtp_username or "",
            password="••••••••" if user.smtp_password_enc else "",
        ),
        configured=has_pwd and bool(user.imap_host and user.smtp_host),
    )


# ── Routes ──


@router.get("/mail", response_model=MailSettingsResponse)
async def get_mail_settings(
    current_user: User = Depends(get_current_user),
):
    """获取当前用户的 IMAP/SMTP 配置 (密码脱敏)."""
    return _masked_config(current_user)


@router.put("/mail", response_model=MailSettingsResponse)
async def update_mail_settings(
    body: MailSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新 IMAP/SMTP 配置. 密码为空字符串时不更新."""
    # IMAP
    current_user.imap_host = body.imap.host
    current_user.imap_port = body.imap.port
    current_user.imap_ssl = body.imap.ssl
    current_user.imap_username = body.imap.username
    if body.imap.password and body.imap.password != "••••••••":
        current_user.imap_password_enc = _encrypt_password(body.imap.password)

    # SMTP
    current_user.smtp_host = body.smtp.host
    current_user.smtp_port = body.smtp.port
    current_user.smtp_ssl = body.smtp.ssl
    current_user.smtp_username = body.smtp.username
    if body.smtp.password and body.smtp.password != "••••••••":
        current_user.smtp_password_enc = _encrypt_password(body.smtp.password)

    await db.flush()
    logger.info("用户 %s 更新了邮件设置", current_user.email)

    return _masked_config(current_user)


@router.post("/mail/test", status_code=status.HTTP_200_OK)
async def test_mail_connection(
    current_user: User = Depends(get_current_user),
):
    """测试 IMAP/SMTP 配置是否有效 (仅测试连接)."""
    from app.imap import list_folders  # lazy import

    errors = []

    # Test IMAP
    if current_user.imap_host:
        try:
            folders = await list_folders(current_user)
            if not folders:
                errors.append("IMAP 连接成功但无文件夹")
        except Exception as e:
            errors.append(f"IMAP: {e}")
    else:
        errors.append("IMAP 未配置")

    # Test SMTP
    if current_user.smtp_host:
        try:
            import aiosmtplib
            smtp_username = current_user.smtp_username or current_user.email
            cipher = Fernet(settings.encryption_key.encode())
            smtp_pwd = cipher.decrypt(
                base64.urlsafe_b64decode(current_user.smtp_password_enc.encode())
            ).decode()
            if current_user.smtp_ssl:
                await aiosmtplib.smtp_connect(
                    hostname=current_user.smtp_host,
                    port=current_user.smtp_port or 465,
                    username=smtp_username,
                    password=smtp_pwd,
                    use_tls=True,
                    timeout=10,
                )
            else:
                await aiosmtplib.smtp_connect(
                    hostname=current_user.smtp_host,
                    port=current_user.smtp_port or 587,
                    username=smtp_username,
                    password=smtp_pwd,
                    start_tls=True,
                    timeout=10,
                )
        except Exception as e:
            errors.append(f"SMTP: {e}")
    else:
        errors.append("SMTP 未配置")

    if errors:
        return {"status": "error", "errors": errors}
    return {"status": "ok", "message": "IMAP 和 SMTP 连接均正常"}


# ─── 笔记设置 ───


@router.get("/notes", response_model=NoteSettingsResponse)
async def get_note_settings(
    current_user: User = Depends(get_current_user),
):
    """获取笔记设置."""
    return NoteSettingsResponse(allow_shares=current_user.note_allow_shares)


@router.put("/notes", response_model=NoteSettingsResponse)
async def update_note_settings(
    body: NoteSettingsResponse,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新笔记设置."""
    current_user.note_allow_shares = body.allow_shares
    await db.flush()
    return NoteSettingsResponse(allow_shares=current_user.note_allow_shares)
