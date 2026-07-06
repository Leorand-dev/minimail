"""
Webmail — 联系人 Schema
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class ContactGroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    color: str | None = None
    sort_order: int = 0
    contact_count: int = 0
    created_at: datetime | None = None


class ContactGroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    color: str | None = None


class ContactGroupUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    sort_order: int | None = None


class ContactResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    group_id: uuid.UUID | None = None
    group_name: str | None = None

    display_name: str = ""
    first_name: str = ""
    last_name: str = ""
    nickname: str = ""
    organization: str = ""
    title: str = ""

    email: str = ""
    email_alt: list[str] = []
    email_business: str = ""

    phone: str = ""
    phone_mobile: str = ""
    phone_business: str = ""

    address: str = ""
    address_business: str = ""

    website: str = ""
    notes: str = ""
    avatar_url: str | None = None
    is_favorite: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class ContactCreate(BaseModel):
    group_id: uuid.UUID | None = None
    display_name: str = ""
    first_name: str = ""
    last_name: str = ""
    nickname: str = ""
    organization: str = ""
    title: str = ""
    email: str = ""
    email_alt: list[str] = []
    email_business: str = ""
    phone: str = ""
    phone_mobile: str = ""
    phone_business: str = ""
    address: str = ""
    address_business: str = ""
    website: str = ""
    notes: str = ""
    avatar_url: str | None = None
    is_favorite: bool = False


class ContactUpdate(BaseModel):
    group_id: uuid.UUID | None = None
    display_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    nickname: str | None = None
    organization: str | None = None
    title: str | None = None
    email: str | None = None
    email_alt: list[str] | None = None
    email_business: str | None = None
    phone: str | None = None
    phone_mobile: str | None = None
    phone_business: str | None = None
    address: str | None = None
    address_business: str | None = None
    website: str | None = None
    notes: str | None = None
    avatar_url: str | None = None
    is_favorite: bool | None = None
