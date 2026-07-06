"""
Minimail — IMAP 连接管理器

为每个活跃用户维护一个 IMAP 连接, 支持自动重连和心跳保活。
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import aioimaplib

from app.config import settings

logger = logging.getLogger("minimail.imap")

_connections: dict[uuid.UUID, aioimaplib.IMAP4_SSL] = {}
_locks: dict[uuid.UUID, asyncio.Lock] = {}

# ── 连接状态追踪 ──
_connection_info: dict[uuid.UUID, dict] = {}


def update_sync_time(user_id: uuid.UUID) -> None:
    """更新用户最后同步时间."""
    info = _connection_info.get(user_id)
    if info:
        from datetime import datetime, timezone
        info["last_sync"] = datetime.now(timezone.utc)


async def connect(
    host: str,
    port: int = 993,
    ssl: bool = True,
    username: str | None = None,
    password: str | None = None,
) -> aioimaplib.IMAP4_SSL:
    """建立 IMAP 连接."""
    if ssl:
        imap = aioimaplib.IMAP4_SSL(host=host, port=port, timeout=30)
    else:
        imap = aioimaplib.IMAP4(host=host, port=port, timeout=30)
    await imap.wait_hello_from_server()
    if username and password:
        await imap.login(username, password)
    return imap


async def get_connection(
    user_id: uuid.UUID,
    imap_host: str,
    imap_port: int,
    imap_ssl: bool,
    imap_username: str,
    imap_password: str,
) -> aioimaplib.IMAP4_SSL:
    """获取或创建用户 IMAP 连接."""
    lock = _locks.setdefault(user_id, asyncio.Lock())

    async with lock:
        existing = _connections.get(user_id)
        if existing and not existing.has_pending_idle():
            # 快速检查是否存活
            try:
                await existing.noop()
                return existing
            except (OSError, aioimaplib.IMAP4Error):
                logger.warning("IMAP 连接 %s 已断开, 准备重连", user_id)

        # 重建连接
        try:
            imap = await connect(
                host=imap_host,
                port=imap_port,
                ssl=imap_ssl,
                username=imap_username,
                password=imap_password,
            )
            _connections[user_id] = imap
            logger.info("IMAP 连接 %s 已建立", user_id)
            _connection_info[user_id] = {"connected": True, "last_sync": None}
            return imap
        except Exception as e:
            logger.error("IMAP 连接 %s 失败: %s", user_id, e)
            raise


async def close_connection(user_id: uuid.UUID) -> None:
    """关闭用户 IMAP 连接."""
    imap = _connections.pop(user_id, None)
    if imap:
        try:
            await imap.logout()
        except Exception:
            try:
                await imap.close()
            except Exception:
                pass
        _connection_info[user_id] = {"connected": False, "last_sync": _connection_info.get(user_id, {}).get("last_sync")}
        logger.info("IMAP 连接 %s 已关闭")


async def close_all() -> None:
    """关闭所有 IMAP 连接 (服务关闭时调用)."""
    for uid in list(_connections.keys()):
        await close_connection(uid)


def get_connection_info(user_id: uuid.UUID) -> dict:
    """获取用户 IMAP 连接状态."""
    return _connection_info.get(user_id, {"connected": False, "last_sync": None})


@asynccontextmanager
async def managed_connection(
    user_id: uuid.UUID,
    imap_host: str,
    imap_port: int,
    imap_ssl: bool,
    imap_username: str,
    imap_password: str,
):
    """上下文管理器: 自动管理 IMAP 连接."""
    imap = await get_connection(
        user_id, imap_host, imap_port, imap_ssl, imap_username, imap_password
    )
    try:
        yield imap
    except (OSError, aioimaplib.IMAP4Error):
        # 连接异常, 清理后重试
        await close_connection(user_id)
        raise
