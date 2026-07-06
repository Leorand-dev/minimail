"""
Minimail — 邮箱账户服务

多账户管理 (CRUD + 设默认 + 迁移旧配置)。
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from cryptography.fernet import Fernet
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.email_account import EmailAccount
from app.models.user import User

# ── 密码加密 (与 settings.py 使用相同密钥) ──

def _get_cipher() -> Fernet:
    from app.services.settings import CIPHER
    return CIPHER


def _encrypt_password(password: str) -> str:
    return _get_cipher().encrypt(password.encode()).decode()


def _decrypt_password(encrypted: str) -> str:
    try:
        return _get_cipher().decrypt(encrypted.encode()).decode()
    except Exception:
        return encrypted


# ── CRUD ──


async def list_accounts(db: AsyncSession, user_id: uuid.UUID) -> list[EmailAccount]:
    """列出用户的所有邮箱账户."""
    result = await db.execute(
        select(EmailAccount)
        .where(EmailAccount.user_id == user_id)
        .order_by(EmailAccount.is_default.desc(), EmailAccount.created_at)
    )
    return list(result.scalars().all())


async def get_account(
    db: AsyncSession, account_id: uuid.UUID, user_id: uuid.UUID
) -> EmailAccount | None:
    """获取单个账户."""
    result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.id == account_id, EmailAccount.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


async def create_account(
    db: AsyncSession,
    user_id: uuid.UUID,
    email: str,
    name: str = "",
    imap_host: str | None = None,
    imap_port: int = 993,
    imap_ssl: bool = True,
    imap_username: str | None = None,
    imap_password: str | None = None,
    smtp_host: str | None = None,
    smtp_port: int = 465,
    smtp_ssl: bool = True,
    smtp_username: str | None = None,
    smtp_password: str | None = None,
    is_default: bool = False,
) -> EmailAccount:
    """创建新邮箱账户."""
    # 如果这是第一个账户，自动设为默认
    existing = await list_accounts(db, user_id)
    if not existing:
        is_default = True

    # 如果设为默认，清除其他账户的默认标记
    if is_default:
        await db.execute(
            update(EmailAccount)
            .where(EmailAccount.user_id == user_id, EmailAccount.is_default == True)
            .values(is_default=False)
        )

    account = EmailAccount(
        user_id=user_id,
        email=email,
        name=name or email.split("@")[0],
        imap_host=imap_host,
        imap_port=imap_port,
        imap_ssl=imap_ssl,
        imap_username=imap_username or email,
        imap_password_enc=_encrypt_password(imap_password) if imap_password else None,
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        smtp_ssl=smtp_ssl,
        smtp_username=smtp_username or email,
        smtp_password_enc=_encrypt_password(smtp_password) if smtp_password else None,
        is_default=is_default,
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)
    return account


async def update_account(
    db: AsyncSession,
    account_id: uuid.UUID,
    user_id: uuid.UUID,
    **kwargs,
) -> EmailAccount | None:
    """更新邮箱账户."""
    account = await get_account(db, account_id, user_id)
    if not account:
        return None

    # 密码需要加密
    if "imap_password" in kwargs and kwargs["imap_password"]:
        kwargs["imap_password_enc"] = _encrypt_password(kwargs.pop("imap_password"))
    elif "imap_password" in kwargs:
        kwargs.pop("imap_password")

    if "smtp_password" in kwargs and kwargs["smtp_password"]:
        kwargs["smtp_password_enc"] = _encrypt_password(kwargs.pop("smtp_password"))
    elif "smtp_password" in kwargs:
        kwargs.pop("smtp_password")

    # 处理 is_default
    if kwargs.get("is_default"):
        await db.execute(
            update(EmailAccount)
            .where(EmailAccount.user_id == user_id, EmailAccount.is_default == True)
            .values(is_default=False)
        )

    for key, value in kwargs.items():
        if hasattr(account, key):
            setattr(account, key, value)

    await db.flush()
    await db.refresh(account)
    return account


async def delete_account(
    db: AsyncSession, account_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """删除邮箱账户."""
    account = await get_account(db, account_id, user_id)
    if not account:
        return False
    await db.delete(account)
    await db.flush()

    # 如果删除的是默认账户，将剩余的第一个设为默认
    remaining = await list_accounts(db, user_id)
    if remaining and account.is_default:
        remaining[0].is_default = True
        await db.flush()

    return True


async def get_default_account(
    db: AsyncSession, user_id: uuid.UUID
) -> EmailAccount | None:
    """获取用户的默认邮箱账户."""
    result = await db.execute(
        select(EmailAccount).where(
            EmailAccount.user_id == user_id, EmailAccount.is_default == True
        )
    )
    return result.scalar_one_or_none()


async def migrate_user_config(
    db: AsyncSession, user: User
) -> EmailAccount | None:
    """将用户的旧配置 (User 表上的 IMAP/SMTP 字段) 迁移到账户."""
    if not user.imap_host and not user.smtp_host:
        return None

    existing = await list_accounts(db, user.id)
    if existing:
        return existing[0]

    account = await create_account(
        db=db,
        user_id=user.id,
        email=user.email,
        name=user.email.split("@")[0],
        imap_host=user.imap_host,
        imap_port=user.imap_port,
        imap_ssl=user.imap_ssl,
        imap_username=user.imap_username or user.email,
        imap_password=_decrypt_password(user.imap_password_enc) if user.imap_password_enc else None,
        smtp_host=user.smtp_host,
        smtp_port=user.smtp_port,
        smtp_ssl=user.smtp_ssl,
        smtp_username=user.smtp_username or user.email,
        smtp_password=_decrypt_password(user.smtp_password_enc) if user.smtp_password_enc else None,
        is_default=True,
    )
    return account
