"""
Minimail — FastAPI 应用入口
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_db, init_db
from app.api import auth, health, mail
from app.api import settings as settings_router
from app.api import contacts, api_tokens, email_accounts, memos


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期: 启动/关闭."""
    await init_db()
    yield
    await close_db()


app = FastAPI(
    title=settings.app_name,
    description="智能邮件系统后端 API",
    version=settings.app_version,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 注册路由 ──
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(mail.router, tags=["mail"])
app.include_router(settings_router.router, tags=["settings"])
app.include_router(contacts.router, tags=["contacts"])
app.include_router(api_tokens.router, tags=["api-tokens"])
app.include_router(email_accounts.router, tags=["accounts"])
app.include_router(memos.router, tags=["memos"])
