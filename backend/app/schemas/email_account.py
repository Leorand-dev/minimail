"""
Webmail — 邮箱账户 Schema
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    name: str = Field("", max_length=128)
    imap_host: str | None = None
    imap_port: int = 993
    imap_ssl: bool = True
    imap_username: str | None = None
    imap_password: str | None = Field(None, min_length=1)
    smtp_host: str | None = None
    smtp_port: int = 465
    smtp_ssl: bool = True
    smtp_username: str | None = None
    smtp_password: str | None = Field(None, min_length=1)
    is_default: bool = False


class AccountUpdate(BaseModel):
    name: str | None = None
    imap_host: str | None = None
    imap_port: int | None = None
    imap_ssl: bool | None = None
    imap_username: str | None = None
    imap_password: str | None = Field(None, min_length=1)
    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_ssl: bool | None = None
    smtp_username: str | None = None
    smtp_password: str | None = Field(None, min_length=1)
    is_default: bool | None = None


class AccountResponse(BaseModel):
    id: str
    email: str
    name: str
    imap_host: str | None
    imap_port: int
    imap_ssl: bool
    imap_username: str | None
    imap_password_masked: bool = False
    smtp_host: str | None
    smtp_port: int
    smtp_ssl: bool
    smtp_username: str | None
    smtp_password_masked: bool = False
    is_default: bool
    created_at: datetime
    configured: bool = False

    class Config:
        from_attributes = True
