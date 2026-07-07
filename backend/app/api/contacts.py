"""
Webmail — 通讯录 API
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.contact import (
    ContactCreate,
    ContactGroupCreate,
    ContactGroupResponse,
    ContactGroupUpdate,
    ContactResponse,
    ContactUpdate,
)
from app.services.auth import get_current_user
from app.services.contact import (
    autocomplete_contacts,
    batch_delete_contacts,
    create_contact,
    create_group,
    delete_contact as svc_delete_contact,
    delete_group as svc_delete_group,
    get_contact as svc_get_contact,
    list_contacts,
    list_groups,
    update_contact as svc_update_contact,
    update_group as svc_update_group,
)

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


# ── 分组 ──


@router.get("/groups", response_model=list[ContactGroupResponse])
async def get_groups(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取分组列表."""
    groups = await list_groups(db, user.id)
    result = []
    for g in groups:
        result.append(
            ContactGroupResponse(
                id=g.id,
                name=g.name,
                color=g.color,
                sort_order=g.sort_order,
                contact_count=len(g.contacts) if g.contacts else 0,
                created_at=g.created_at,
            )
        )
    return result


@router.post("/groups", response_model=ContactGroupResponse, status_code=201, summary="创建分组")
async def create_group_route(
    data: ContactGroupCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建分组."""
    group = await create_group(db, user.id, data)
    return ContactGroupResponse(
        id=group.id,
        name=group.name,
        color=group.color,
        sort_order=group.sort_order,
        contact_count=0,
        created_at=group.created_at,
    )


@router.put("/groups/{group_id}", response_model=ContactGroupResponse)
async def update_group(
    group_id: uuid.UUID = Path(..., description="分组 ID"),
    data: ContactGroupUpdate = ...,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新分组."""
    group = await svc_update_group(db, group_id, user.id, data)
    if not group:
        raise HTTPException(404, "分组不存在")
    return ContactGroupResponse(
        id=group.id,
        name=group.name,
        color=group.color,
        sort_order=group.sort_order,
        contact_count=len(group.contacts) if group.contacts else 0,
        created_at=group.created_at,
    )


@router.delete("/groups/{group_id}", status_code=204)
async def delete_group(
    group_id: uuid.UUID = Path(..., description="分组 ID"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除分组."""
    ok = await svc_delete_group(db, group_id, user.id)
    if not ok:
        raise HTTPException(404, "分组不存在")


# ── 联系人 ──


@router.get("", response_model=dict)
async def get_contacts(
    group_id: uuid.UUID | None = Query(None),
    search: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    favorites_only: bool = Query(False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取联系人列表 (分页/搜索/筛选)."""
    contacts, total = await list_contacts(
        db, user.id, group_id=group_id, search=search,
        page=page, page_size=page_size, favorites_only=favorites_only,
    )
    return {
        "contacts": [
            ContactResponse(
                id=c.id,
                user_id=c.user_id,
                group_id=c.group_id,
                group_name=c.group.name if c.group else None,
                display_name=c.display_name,
                first_name=c.first_name,
                last_name=c.last_name,
                nickname=c.nickname,
                organization=c.organization,
                title=c.title,
                email=c.email,
                email_alt=c.email_alt or [],
                email_business=c.email_business,
                phone=c.phone,
                phone_mobile=c.phone_mobile,
                phone_business=c.phone_business,
                address=c.address,
                address_business=c.address_business,
                website=c.website,
                notes=c.notes,
                avatar_url=c.avatar_url,
                is_favorite=c.is_favorite,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in contacts
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/autocomplete", response_model=list[ContactResponse])
async def autocomplete(
    query: str = Query(..., min_length=1, description="搜索关键词, 匹配姓名或邮箱"),
    limit: int = Query(10, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """联系人自动完成 (用于收件人输入)."""
    contacts = await autocomplete_contacts(db, user.id, query, limit)
    return [
        ContactResponse(
            id=c.id,
            user_id=c.user_id,
            group_name=c.group.name if c.group else None,
            display_name=c.display_name or "",
            email=c.email,
        )
        for c in contacts
    ]


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: uuid.UUID = Path(..., description="联系人 ID"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个联系人."""
    contact = await svc_get_contact(db, contact_id, user.id)
    if not contact:
        raise HTTPException(404, "联系人不存在")
    return ContactResponse(
        id=contact.id,
        user_id=contact.user_id,
        group_id=contact.group_id,
        group_name=contact.group.name if contact.group else None,
        display_name=contact.display_name,
        first_name=contact.first_name,
        last_name=contact.last_name,
        nickname=contact.nickname,
        organization=contact.organization,
        title=contact.title,
        email=contact.email,
        email_alt=contact.email_alt or [],
        email_business=contact.email_business,
        phone=contact.phone,
        phone_mobile=contact.phone_mobile,
        phone_business=contact.phone_business,
        address=contact.address,
        address_business=contact.address_business,
        website=contact.website,
        notes=contact.notes,
        avatar_url=contact.avatar_url,
        is_favorite=contact.is_favorite,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )


@router.post("", response_model=ContactResponse, status_code=201, summary="创建联系人")
async def create_contact_route(
    data: ContactCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建联系人."""
    contact = await create_contact(db, user.id, data)
    return ContactResponse(
        id=contact.id,
        user_id=contact.user_id,
        group_id=contact.group_id,
        group_name=contact.group.name if contact.group else None,
        display_name=contact.display_name,
        email=contact.email,
    )


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: uuid.UUID = Path(..., description="联系人 ID"),
    data: ContactUpdate = ...,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """更新联系人."""
    contact = await svc_update_contact(db, contact_id, user.id, data)
    if not contact:
        raise HTTPException(404, "联系人不存在")
    return ContactResponse(
        id=contact.id,
        user_id=contact.user_id,
        group_id=contact.group_id,
        group_name=contact.group.name if contact.group else None,
        display_name=contact.display_name,
        first_name=contact.first_name,
        last_name=contact.last_name,
        nickname=contact.nickname,
        organization=contact.organization,
        title=contact.title,
        email=contact.email,
        email_alt=contact.email_alt or [],
        email_business=contact.email_business,
        phone=contact.phone,
        phone_mobile=contact.phone_mobile,
        phone_business=contact.phone_business,
        address=contact.address,
        address_business=contact.address_business,
        website=contact.website,
        notes=contact.notes,
        avatar_url=contact.avatar_url,
        is_favorite=contact.is_favorite,
        created_at=contact.created_at,
        updated_at=contact.updated_at,
    )


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: uuid.UUID = Path(..., description="联系人 ID"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """删除联系人."""
    ok = await svc_delete_contact(db, contact_id, user.id)
    if not ok:
        raise HTTPException(404, "联系人不存在")


@router.post("/batch-delete", status_code=200)
async def batch_delete(
    contact_ids: list[uuid.UUID],
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """批量删除联系人."""
    count = await batch_delete_contacts(db, user.id, contact_ids)
    return {"deleted": count}
