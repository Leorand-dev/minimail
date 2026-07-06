"""
Webmail — 应用配置 (Pydantic Settings)
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── 应用基础 ──
    app_name: str = "Minimail"
    app_version: str = "0.1.0"
    debug: bool = True

    # ── 数据库 ──
    database_url: str = "postgresql+asyncpg://webmail:webmail_dev@localhost:5432/webmail"
    database_echo: bool = False

    # ── Redis ──
    redis_url: str = "redis://localhost:6379/0"

    # ── JWT ──
    secret_key: str = "dev-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # ── 加密 (IMAP/SMTP 密码) ──
    encryption_key: str = "dev-encryption-key-32chars!!!"  # 必须 32 字节

    # ── CORS ──
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # ── LLM (AI Agent) ──
    llm_api_key: Optional[str] = None
    llm_base_url: Optional[str] = None
    llm_model: str = "gpt-4o"

    # ── 上传 ──
    max_upload_size_mb: int = 25
    upload_dir: str = str(Path.home() / ".webmail" / "uploads")


settings = Settings()
