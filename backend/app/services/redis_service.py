"""
Webmail — Redis 服务 (连接池 + JSON 存取)
"""

from __future__ import annotations

import json
from typing import Any, Optional

import redis.asyncio as aioredis

from app.config import settings

redis_pool: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    """获取 Redis 连接 (惰性初始化)."""
    global redis_pool
    if redis_pool is None:
        redis_pool = await aioredis.from_url(
            settings.redis_url,
            decode_responses=True,
            max_connections=20,
        )
    return redis_pool


async def close_redis():
    """关闭 Redis 连接池."""
    global redis_pool
    if redis_pool:
        await redis_pool.close()
        redis_pool = None


async def set_json(key: str, value: Any, ttl: Optional[int] = None) -> None:
    """存储 JSON 序列化数据到 Redis."""
    r = await get_redis()
    data = json.dumps(value, default=str)
    if ttl:
        await r.setex(key, ttl, data)
    else:
        await r.set(key, data)


async def get_json(key: str) -> Optional[Any]:
    """从 Redis 读取 JSON 数据."""
    r = await get_redis()
    data = await r.get(key)
    if data is None:
        return None
    return json.loads(data)


async def delete_key(key: str) -> None:
    """删除 Redis key."""
    r = await get_redis()
    await r.delete(key)


async def ping_redis() -> bool:
    """检查 Redis 连接是否正常."""
    try:
        r = await get_redis()
        return await r.ping()
    except Exception:
        return False
