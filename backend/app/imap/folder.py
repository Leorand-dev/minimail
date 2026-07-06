"""
Webmail — IMAP 文件夹操作
"""

from __future__ import annotations

import logging
import uuid

from app.imap.connection import get_connection
from app.imap.types import Folder

logger = logging.getLogger("webmail.imap.folder")

# IMAP 标准邮箱文件夹名称
STANDARD_FOLDERS = [
    "INBOX",
    "Drafts",
    "Sent",
    "Junk",
    "Trash",
    "Archive",
]

# 常见中文/非标准别名映射
FOLDER_ALIASES: dict[str, str] = {
    "[Gmail]/Drafts": "Drafts",
    "[Gmail]/Sent Mail": "Sent",
    "[Gmail]/Spam": "Junk",
    "[Gmail]/Trash": "Trash",
    "[Gmail]/All Mail": "Archive",
    "[Gmail]/Starred": "Flagged",
    "已发送": "Sent",
    "草稿箱": "Drafts",
    "垃圾邮件": "Junk",
    "已删除": "Trash",
}


async def get_user_connection_imap(
    user_id: uuid.UUID,
    imap_host: str,
    imap_port: int,
    imap_ssl: bool,
    imap_username: str,
    imap_password: str,
):
    """获取用户连接的快捷方式."""
    return await get_connection(
        user_id, imap_host, imap_port, imap_ssl, imap_username, imap_password
    )


def _normalize_flags(raw_flags: bytes | list[bytes]) -> list[str]:
    """将 IMAP 标志字节转为字符串列表."""
    if isinstance(raw_flags, bytes):
        raw_flags = [raw_flags]
    result = []
    for f in raw_flags:
        if isinstance(f, bytes):
            result.append(f.decode("ascii", errors="replace").strip('"'))
        else:
            result.append(str(f).strip('"'))
    return result


async def list_folders(imap, subscribed_only: bool = False) -> list[Folder]:
    """列出用户邮箱所有文件夹."""
    cmd = 'LIST "" "*"'
    if subscribed_only:
        cmd = 'LSUB "" "*"'

    await imap.noop()
    typ, data = await imap.list()

    folders: list[Folder] = []
    for item in data:
        if not item or item == b"":
            continue
        # 解析 LIST 响应: (\\HasNoChildren) "/" INBOX
        decoded = item.decode("utf-8", errors="replace") if isinstance(item, bytes) else item
        parts = decoded.split('"')
        flags_str = parts[0].strip("() ").strip()
        flags = [f.strip() for f in flags_str.split() if f.strip(" \\")] if flags_str else []

        delim = parts[1].strip() if len(parts) > 1 else "/"
        name_part = parts[-1].strip() if len(parts) > 2 else parts[0].rsplit(maxsplit=1)[-1] if parts else ""
        name = name_part.strip()

        if not name:
            continue

        folders.append(
            Folder(
                name=name,
                delim=delim,
                flags=flags,
            )
        )

    # 获取 STATUS 信息 (exists, unseen, recent)
    for folder in folders:
        if folder.is_container:
            continue
        try:
            typ, status_data = await imap.status(folder.name, "(MESSAGES UNSEEN RECENT)")
            if status_data and status_data[0]:
                status_str = status_data[0].decode("utf-8", errors="replace")
                # 解析 STATUS 响应
                for part in status_str.split("(")[-1].rstrip(")").split():
                    kv = part.split("=")
                    if len(kv) == 2:
                        key, val = kv
                        if key == "MESSAGES":
                            folder.exists = int(val)
                        elif key == "UNSEEN":
                            folder.unseen = int(val)
                        elif key == "RECENT":
                            folder.recent = int(val)
        except Exception:
            logger.warning("无法获取 %s 的 STATUS", folder.name)

    # 排序: INBOX 排第一, 标准文件夹优先
    def sort_key(f: Folder) -> tuple:
        if f.name == "INBOX":
            return (0, "")
        if f.name in STANDARD_FOLDERS:
            return (1, f.name)
        return (2, f.name)

    folders.sort(key=sort_key)
    return folders


async def create_folder(imap, name: str) -> bool:
    """创建新文件夹."""
    try:
        await imap.create(name)
        return True
    except Exception as e:
        logger.error("创建文件夹 %s 失败: %s", name, e)
        return False


async def rename_folder(imap, old_name: str, new_name: str) -> bool:
    """重命名文件夹."""
    try:
        await imap.rename(old_name, new_name)
        return True
    except Exception as e:
        logger.error("重命名文件夹 %s → %s 失败: %s", old_name, new_name, e)
        return False


async def delete_folder(imap, name: str) -> bool:
    """删除文件夹."""
    try:
        await imap.delete(name)
        return True
    except Exception as e:
        logger.error("删除文件夹 %s 失败: %s", name, e)
        return False


async def subscribe_folder(imap, name: str) -> bool:
    """订阅文件夹."""
    try:
        await imap.subscribe(name)
        return True
    except Exception as e:
        logger.error("订阅文件夹 %s 失败: %s", name, e)
        return False


async def unsubscribe_folder(imap, name: str) -> bool:
    """取消订阅文件夹."""
    try:
        await imap.unsubscribe(name)
        return True
    except Exception as e:
        logger.error("取消订阅文件夹 %s 失败: %s", name, e)
        return False
