"""
Webmail — 邮箱账户 API 路由
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.email_account import EmailAccount
from app.models.user import User
from app.schemas.email_account import AccountCreate, AccountResponse, AccountUpdate
from app.services.auth import get_current_user
from app.services.email_account import (
    create_account,
    delete_account,
    get_account,
    list_accounts,
    migrate_user_config,
    update_account,
)

router = APIRouter(prefix="/api/settings/accounts", tags=["accounts"])


def _to_response(acc: EmailAccount) -> AccountResponse:
    return AccountResponse(
        id=str(acc.id),
        email=acc.email,
        name=acc.name,
        imap_host=acc.imap_host,
        imap_port=acc.imap_port,
        imap_ssl=acc.imap_ssl,
        imap_username=acc.imap_username,
        imap_password_masked=bool(acc.imap_password_enc),
        smtp_host=acc.smtp_host,
        smtp_port=acc.smtp_port,
        smtp_ssl=acc.smtp_ssl,
        smtp_username=acc.smtp_username,
        smtp_password_masked=bool(acc.smtp_password_enc),
        is_default=acc.is_default,
        created_at=acc.created_at,
        configured=bool(acc.imap_host and acc.imap_password_enc),
    )


@router.get("")
async def get_accounts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AccountResponse]:
    """获取用户的所有邮箱账户."""
    # 自动迁移旧配置
    await migrate_user_config(db, user)
    await db.commit()

    accounts = await list_accounts(db, user.id)
    return [_to_response(a) for a in accounts]


@router.post("", status_code=201)
async def add_account(
    body: AccountCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AccountResponse:
    """添加新邮箱账户."""
    acc = await create_account(
        db=db,
        user_id=user.id,
        email=body.email,
        name=body.name,
        imap_host=body.imap_host,
        imap_port=body.imap_port,
        imap_ssl=body.imap_ssl,
        imap_username=body.imap_username,
        imap_password=body.imap_password,
        smtp_host=body.smtp_host,
        smtp_port=body.smtp_port,
        smtp_ssl=body.smtp_ssl,
        smtp_username=body.smtp_username,
        smtp_password=body.smtp_password,
        is_default=body.is_default,
    )
    await db.commit()
    return _to_response(acc)


@router.put("/{account_id}")
async def edit_account(
    account_id: uuid.UUID = Path(...),
    body: AccountUpdate = ...,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AccountResponse:
    """更新邮箱账户."""
    kwargs = body.model_dump(exclude_none=True)

    acc = await update_account(db, account_id, user.id, **kwargs)
    if not acc:
        raise HTTPException(status_code=404, detail="账户未找到")
    await db.commit()
    return _to_response(acc)


@router.delete("/{account_id}", status_code=204)
async def remove_account(
    account_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除邮箱账户."""
    ok = await delete_account(db, account_id, user.id)
    if not ok:
        raise HTTPException(status_code=404, detail="账户未找到")
    await db.commit()


@router.post("/{account_id}/default")
async def set_default_account(
    account_id: uuid.UUID = Path(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AccountResponse:
    """设为默认账户."""
    acc = await get_account(db, account_id, user.id)
    if not acc:
        raise HTTPException(status_code=404, detail="账户未找到")

    acc = await update_account(db, account_id, user.id, is_default=True)
    await db.commit()
    return _to_response(acc)
