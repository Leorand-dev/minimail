"""
Webmail — Auth schemas (请求/响应)
"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr = Field(..., description="用户邮箱")
    password: str = Field(..., min_length=8, max_length=128, description="密码")
    name: str = Field("", max_length=128, description="显示名称")

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("密码必须包含至少一个大写字母")
        if not re.search(r"[a-z]", v):
            raise ValueError("密码必须包含至少一个小写字母")
        if not re.search(r"\d", v):
            raise ValueError("密码必须包含至少一个数字")
        return v


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="用户邮箱")
    password: str = Field(..., description="密码")


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="刷新令牌")


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    language: str
    theme: str
    messages_per_page: int
    preview_pane: bool
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class ErrorResponse(BaseModel):
    detail: str


class UpdateProfileRequest(BaseModel):
    name: str = Field("", max_length=128, description="新显示名称")


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="当前密码")
    new_password: str = Field(..., min_length=8, max_length=128, description="新密码")

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("新密码必须包含至少一个大写字母")
        if not re.search(r"[a-z]", v):
            raise ValueError("新密码必须包含至少一个小写字母")
        if not re.search(r"\d", v):
            raise ValueError("新密码必须包含至少一个数字")
        return v
