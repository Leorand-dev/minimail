"""
Webmail — API 令牌 Schema
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ApiTokenCreate(BaseModel):
    """创建 API 令牌请求."""
    name: str = Field(..., min_length=1, max_length=128, description="令牌名称")
    scopes: str = Field(default="read", description="权限范围 (逗号分隔)")
    expires_in_days: int = Field(default=0, ge=0, description="过期天数, 0=永不过期")


class ApiTokenResponse(BaseModel):
    """API 令牌响应 (不含完整 token)."""
    id: uuid.UUID
    name: str
    token_prefix: str
    scopes: str
    last_used_at: datetime | None = None
    expires_at: datetime | None = None
    is_revoked: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiTokenCreatedResponse(ApiTokenResponse):
    """创建成功后返回的响应 (含完整 token, 仅显示一次)."""
    token: str = Field(..., description="完整 API token, 请妥善保存")


class ApiTokenUpdate(BaseModel):
    """更新令牌 (重命名)."""
    name: Optional[str] = None
