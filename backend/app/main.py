"""
Minimail — FastAPI 应用入口
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import close_db, init_db
from app.api import auth, health, mail
from app.api import settings as settings_router
from app.api import contacts, api_tokens, email_accounts, files, memos, search, shares, system_docs


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

# ── 统一错误处理 ──


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器 — 返回统一格式的错误响应."""
    import logging

    logger = logging.getLogger("webmail.error")

    # FastAPI HTTPException 直接透传
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail, "code": exc.status_code},
        )

    # Pydantic 验证错误
    if hasattr(exc, "errors"):
        return JSONResponse(
            status_code=422,
            content={
                "detail": "请求数据验证失败",
                "code": 422,
                "errors": exc.errors() if hasattr(exc, "errors") else [],
            },
        )

    # 未捕获异常 → 500
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误", "code": 500},
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
app.include_router(shares.router, tags=["shares"])
app.include_router(files.router, tags=["files"])
app.include_router(search.router, tags=["search"])
app.include_router(system_docs.router, tags=["docs"])
