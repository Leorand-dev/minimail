"""
Webmail — 数据库引擎与会话 (SQLAlchemy 2.0 async)
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

logger = logging.getLogger("webmail.db")

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    """应用启动时: 创建所有表 (不依赖 pgvector)."""
    try:
        # 先试创建 pgvector 扩展 (独立连接, 失败不影响建表)
        try:
            async with engine.connect() as conn:
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                await conn.commit()
        except Exception:
            logger.info("pgvector 扩展不可用, 跳过")

        # 创建所有表 (新连接)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # 迁移: 添加 username 列 (如果不存在)
        try:
            async with engine.begin() as conn:
                await conn.execute(text(
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(64) UNIQUE DEFAULT ''"
                ))
        except Exception:
            pass

        logger.info("数据库表已创建/验证")
    except Exception as e:
        logger.warning("数据库表创建失败: %s", e)


async def close_db() -> None:
    """应用关闭时: 释放连接池."""
    logger.info("关闭数据库连接池")
    await engine.dispose()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI 依赖注入: 获取数据库会话."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
