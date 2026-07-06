"""
Minimail — Redis 服务 (连接池 + JSON 存取)
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import redis.asyncio as aioredis

from app.config import settings

logger = logging.getLogger("minimail.redis")

redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> Optional[aioredis.Redis]:
    """获取 Redis 连接 (惰性初始化)."""
    global redis_pool
    if redis_pool is None:
        try:
            redis_pool = await aioredis.from_url(
                settings.redis_url,
                decode_responses=True,
                max_connections=20,
                socket_connect_timeout=2,
                socket_timeout=5,
                retry_on_timeout=True,
            )
            await redis_pool.ping()
        except Exception as e:
            logger.warning("Redis 不可用: %s", e)
            redis_pool = None
    if redis_pool is None:
        return None
    return redis_pool


async def close_redis():
    """关闭 Redis 连接池."""
    global redis_pool
    if redis_pool:
        await redis_pool.close()
        redis_pool = None


async def _check_ready():
    """检查 Redis 是否可用, 不可用则返回 False 但不抛异常."""
    r = await get_redis()
    return r is not None


async def set_json(key: str, value: Any, ttl: Optional[int] = None) -> None:
    """存储 JSON 序列化数据到 Redis."""
    r = await get_redis()
    if r is None:
        return
    data = json.dumps(value, default=str)
    if ttl:
        await r.setex(key, ttl, data)
    else:
        await r.set(key, data)


async def get_json(key: str) -> Optional[Any]:
    """从 Redis 读取 JSON 数据."""
    r = await get_redis()
    if r is None:
        return None
    data = await r.get(key)
    if data is None:
        return None
    return json.loads(data)


async def delete_key(key: str) -> None:
    """删除 Redis key."""
    r = await get_redis()
    if r is None:
        return
    await r.delete(key)


async def ping_redis() -> bool:
    """检查 Redis 是否工作."""
    r = await get_redis()
    if r is None:
        return False
    try:
        return await r.ping()
    except Exception:
        return False
