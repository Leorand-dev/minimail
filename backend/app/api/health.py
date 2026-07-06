"""
Webmail — 健康检查路由
"""

from __future__ import annotations

import time

from fastapi import APIRouter
from sqlalchemy import text

from app.config import settings
from app.database import async_session_factory
from app.services.redis_service import ping_redis

router = APIRouter(tags=["health"])

_start_time: float = time.time()


@router.get("/health")
async def health():
    """基础健康检查."""
    return {
        "status": "ok",
        "version": settings.app_version,
        "uptime_seconds": int(time.time() - _start_time),
    }


@router.get("/health/db")
async def health_db():
    """数据库连接检查."""
    try:
        async with async_session_factory() as session:
            result = await session.execute(text("SELECT 1 AS ok"))
            row = result.one_or_none()
            db_ok = row is not None and row[0] == 1
        return {"status": "ok" if db_ok else "error", "database": "connected" if db_ok else "unreachable"}
    except Exception as e:
        return {"status": "error", "database": "unreachable", "detail": str(e)}


@router.get("/health/redis")
async def health_redis():
    """Redis 连接检查."""
    try:
        ok = await ping_redis()
        return {"status": "ok" if ok else "error", "redis": "connected" if ok else "unreachable"}
    except Exception as e:
        return {"status": "error", "redis": "unreachable", "detail": str(e)}
