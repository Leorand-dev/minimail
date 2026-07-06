"""
Webmail — 通讯录服务
"""

from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.contact import Contact, ContactGroup
from app.schemas.contact import (
    ContactCreate,
    ContactGroupCreate,
    ContactGroupUpdate,
    ContactResponse,
    ContactUpdate,
)


# ── 分组 ──


async def list_groups(db: AsyncSession, user_id: uuid.UUID) -> list[ContactGroup]:
    """获取用户的所有分组 (含联系人计数)."""
    result = await db.execute(
        select(ContactGroup)
        .where(ContactGroup.user_id == user_id)
        .order_by(ContactGroup.sort_order, ContactGroup.name)
    )
    return list(result.scalars().all())


async def create_group(
    db: AsyncSession, user_id: uuid.UUID, data: ContactGroupCreate
) -> ContactGroup:
    """创建分组."""
    group = ContactGroup(user_id=user_id, name=data.name, color=data.color)
    db.add(group)
    await db.flush()
    return group


async def update_group(
    db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID, data: ContactGroupUpdate
) -> ContactGroup | None:
    """更新分组."""
    result = await db.execute(
        select(ContactGroup).where(
            ContactGroup.id == group_id, ContactGroup.user_id == user_id
        )
    )
    group = result.scalar_one_or_none()
    if not group:
        return None
    if data.name is not None:
        group.name = data.name
    if data.color is not None:
        group.color = data.color
    if data.sort_order is not None:
        group.sort_order = data.sort_order
    await db.flush()
    return group


async def delete_group(
    db: AsyncSession, group_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """删除分组 (联系人保留但 group_id 置空)."""
    result = await db.execute(
        select(ContactGroup).where(
            ContactGroup.id == group_id, ContactGroup.user_id == user_id
        )
    )
    group = result.scalar_one_or_none()
    if not group:
        return False
    await db.delete(group)
    return True


# ── 联系人 ──


async def list_contacts(
    db: AsyncSession,
    user_id: uuid.UUID,
    group_id: uuid.UUID | None = None,
    search: str = "",
    page: int = 1,
    page_size: int = 50,
    favorites_only: bool = False,
) -> tuple[list[Contact], int]:
    """获取联系人列表."""
    query = select(Contact).where(Contact.user_id == user_id)

    if group_id is not None:
        query = query.where(Contact.group_id == group_id)
    if favorites_only:
        query = query.where(Contact.is_favorite == True)  # noqa: E712
    if search:
        like = f"%{search}%"
        query = query.where(
            or_(
                Contact.display_name.ilike(like),
                Contact.email.ilike(like),
                Contact.email_alt.any(search),
                Contact.phone.ilike(like),
                Contact.phone_mobile.ilike(like),
                Contact.organization.ilike(like),
            )
        )

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_q)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(Contact.display_name, Contact.email).offset(
        (page - 1) * page_size
    ).limit(page_size)

    result = await db.execute(query)
    contacts = list(result.scalars().all())
    return contacts, total


async def get_contact(
    db: AsyncSession, contact_id: uuid.UUID, user_id: uuid.UUID
) -> Contact | None:
    """获取单个联系人."""
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def create_contact(
    db: AsyncSession, user_id: uuid.UUID, data: ContactCreate
) -> Contact:
    """创建联系人."""
    contact = Contact(user_id=user_id, **data.model_dump(exclude_none=True))
    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    return contact


async def update_contact(
    db: AsyncSession,
    contact_id: uuid.UUID,
    user_id: uuid.UUID,
    data: ContactUpdate,
) -> Contact | None:
    """更新联系人."""
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        return None
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(contact, field, value)
    await db.flush()
    await db.refresh(contact)
    return contact


async def delete_contact(
    db: AsyncSession, contact_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    """删除联系人."""
    result = await db.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user_id)
    )
    contact = result.scalar_one_or_none()
    if not contact:
        return False
    await db.delete(contact)
    return True


async def batch_delete_contacts(
    db: AsyncSession, user_id: uuid.UUID, contact_ids: list[uuid.UUID]
) -> int:
    """批量删除联系人."""
    result = await db.execute(
        select(Contact).where(
            Contact.user_id == user_id, Contact.id.in_(contact_ids)
        )
    )
    contacts = list(result.scalars().all())
    for c in contacts:
        await db.delete(c)
    return len(contacts)


async def autocomplete_contacts(
    db: AsyncSession, user_id: uuid.UUID, query: str, limit: int = 10
) -> list[Contact]:
    """联系人自动完成 (按 email / display_name 模糊搜索)."""
    like = f"%{query}%"
    result = await db.execute(
        select(Contact)
        .where(
            Contact.user_id == user_id,
            or_(
                Contact.email.ilike(like),
                Contact.display_name.ilike(like),
            ),
        )
        .order_by(Contact.display_name)
        .limit(limit)
    )
    return list(result.scalars().all())
