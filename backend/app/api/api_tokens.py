"""
Minimail — API 令牌路由
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.api_token import ApiToken
from app.models.user import User
from app.schemas.api_token import (
    ApiTokenCreate,
    ApiTokenCreatedResponse,
    ApiTokenResponse,
    ApiTokenUpdate,
)
from app.services.api_token import create_token, list_tokens, revoke_token
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/auth/tokens", tags=["api-tokens"])


@router.get("", response_model=list[ApiTokenResponse])
async def list_api_tokens(
    include_revoked: bool = Query(False, description="是否包含已撤销的令牌"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """列出当前用户的 API 令牌."""
    return await list_tokens(db, user.id, include_revoked)


@router.post("", response_model=ApiTokenCreatedResponse, status_code=status.HTTP_201_CREATED)
async def create_api_token(
    data: ApiTokenCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新的 API 令牌."""
    token, full_token = await create_token(
        db, user.id, data.name, data.scopes, data.expires_in_days
    )
    return ApiTokenCreatedResponse(
        id=token.id,
        name=token.name,
        token_prefix=token.token_prefix,
        token=full_token,
        scopes=token.scopes,
        last_used_at=token.last_used_at,
        expires_at=token.expires_at,
        is_revoked=token.is_revoked,
        created_at=token.created_at,
    )


@router.delete("/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_token(
    token_id: uuid.UUID = Path(..., description="API 令牌 ID"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """撤销 API 令牌."""
    token = await revoke_token(db, token_id, user.id)
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="令牌不存在")


@router.put("/{token_id}", response_model=ApiTokenResponse)
async def update_api_token(
    token_id: uuid.UUID = Path(..., description="API 令牌 ID"),
    data: ApiTokenUpdate = ...,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新令牌 (重命名)."""
    result = await db.execute(
        select(ApiToken).where(
            ApiToken.id == token_id,
            ApiToken.user_id == user.id,
        )
    )
    token = result.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="令牌不存在")
    if data.name is not None:
        token.name = data.name
    await db.flush()
    await db.refresh(token)
    return token
