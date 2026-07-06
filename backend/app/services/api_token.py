"""
Webmail — API 令牌服务

生成/验证/撤销 API 令牌。
令牌格式: wm_<前缀32位随机十六进制> (如 wm_a3f8c2b1e9d07456...)
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.api_token import ApiToken

API_TOKEN_PREFIX = "wm_"


def _generate_token() -> tuple[str, str, str]:
    """生成令牌, 返回 (full_token, token_hash, token_prefix)."""
    raw = secrets.token_hex(32)
    full = f"{API_TOKEN_PREFIX}{raw}"
    h = hashlib.sha256(full.encode()).hexdigest()
    prefix = full[:8]  # wm_ + 前4位 hex (共8字符)
    return full, h, prefix


def hash_token(token: str) -> str:
    """对外: 对 token 做 SHA-256 哈希用于验证."""
    return hashlib.sha256(token.encode()).hexdigest()


async def create_token(
    db: AsyncSession,
    user_id: uuid.UUID,
    name: str,
    scopes: str = "read",
    expires_in_days: int = 0,
) -> tuple[ApiToken, str]:
    """创建新令牌, 返回 (ApiToken 对象, 完整 token 字符串)."""
    full_token, token_hash, token_prefix = _generate_token()
    expires_at = None
    if expires_in_days > 0:
        expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)

    token = ApiToken(
        user_id=user_id,
        name=name,
        token_hash=token_hash,
        token_prefix=token_prefix,
        scopes=scopes,
        expires_at=expires_at,
    )
    db.add(token)
    await db.flush()
    await db.refresh(token)
    return token, full_token


async def list_tokens(
    db: AsyncSession,
    user_id: uuid.UUID,
    include_revoked: bool = False,
) -> list[ApiToken]:
    """列出用户的令牌."""
    stmt = select(ApiToken).where(ApiToken.user_id == user_id)
    if not include_revoked:
        stmt = stmt.where(ApiToken.is_revoked == False)  # noqa: E712
    stmt = stmt.order_by(ApiToken.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def revoke_token(
    db: AsyncSession,
    token_id: uuid.UUID,
    user_id: uuid.UUID,
) -> ApiToken | None:
    """撤销令牌."""
    result = await db.execute(
        select(ApiToken).where(
            ApiToken.id == token_id,
            ApiToken.user_id == user_id,
        )
    )
    token = result.scalar_one_or_none()
    if not token:
        return None
    token.is_revoked = True
    await db.flush()
    await db.refresh(token)
    return token


async def validate_token(db: AsyncSession, token_str: str) -> ApiToken | None:
    """验证 token 有效性. 检查哈希、是否撤销、是否过期."""
    token_hash = hash_token(token_str)
    result = await db.execute(
        select(ApiToken).where(ApiToken.token_hash == token_hash)
    )
    token = result.scalar_one_or_none()
    if not token:
        return None
    if token.is_revoked:
        return None
    if token.expires_at and token.expires_at < datetime.now(timezone.utc):
        return None
    return token
