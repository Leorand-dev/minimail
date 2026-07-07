"""
Minimail — IMAP 邮件操作 (搜索/获取/移动/删除)
"""

from __future__ import annotations

import logging

from app.imap.parser import parse_message, parse_summary
from app.imap.types import MessageDetail, MessageSummary

logger = logging.getLogger("minimail.imap.message")

FETCH_HEADERS = "(UID FLAGS RFC822.SIZE INTERNALDATE BODYSTRUCTURE BODY.PEEK[HEADER.FIELDS (Subject From To Cc Date Message-ID In-Reply-To References)])"


async def fetch_messages(
    imap,
    folder: str = "INBOX",
    page: int = 1,
    page_size: int = 50,
    sort_field: str = "date",
    sort_order: str = "DESC",
) -> tuple[list[MessageSummary], int]:
    """获取邮件列表, 支持分页排序.

    Returns:
        (messages, total_count)
    """
    await imap.noop()
    await imap.select(folder)

    # 获取总数
    typ, data = await imap.search("ALL")
    if typ != "OK" or not data or not data[0]:
        return [], 0

    all_uids_str = data[0].decode("utf-8", errors="replace")
    if not all_uids_str.strip():
        return [], 0

    all_uids = [int(uid) for uid in all_uids_str.split()]
    total = len(all_uids)

    # 排序 (IMAP 默认按 UID 升序)
    if sort_order.upper() != "DESC":
        all_uids = all_uids[::-1]

    # 分页
    start = (page - 1) * page_size
    end = min(start + page_size, total)
    if start >= total:
        return [], total

    page_uids = all_uids[start:end]
    uid_set = ",".join(str(uid) for uid in page_uids)

    # FETCH 摘要
    typ, fetch_data = await imap.uid("FETCH", uid_set, FETCH_HEADERS)
    if typ != "OK":
        return [], total

    messages: list[MessageSummary] = []
    for response_data in fetch_data:
        if not isinstance(response_data, tuple):
            continue
        seq = response_data[0]
        raw_data = response_data[1]
        if not isinstance(raw_data, list):
            continue

        # Extract UID
        uid = 0
        for pair in raw_data:
            if isinstance(pair, tuple) and len(pair) >= 1:
                key = pair[0]
                if isinstance(key, bytes) and key.upper() == b"UID":
                    uid = int(pair[1]) if isinstance(pair[1], (int, bytes)) else 0
                    break

        if uid == 0:
            continue

        summary = parse_summary(raw_data, uid, seq)
        messages.append(summary)

    return messages, total


async def fetch_message_detail(
    imap,
    folder: str,
    uid: int,
) -> MessageDetail | None:
    """获取单封邮件的完整内容."""
    await imap.noop()
    await imap.select(folder)

    # 获取 FLAGS + 完整邮件
    typ, fetch_data = await imap.uid("FETCH", str(uid), "(FLAGS RFC822)")
    if typ != "OK" or not fetch_data:
        return None

    seq = 0
    raw_email = b""
    flags: list[str] = []

    for response_data in fetch_data:
        if not isinstance(response_data, tuple):
            continue
        seq = response_data[0]
        raw_list = response_data[1]
        if not isinstance(raw_list, list):
            continue
        for pair in raw_list:
            if not isinstance(pair, tuple):
                continue
            key = pair[0]
            value = pair[1] if len(pair) > 1 else b""

            if isinstance(key, bytes) and key.upper() == b"FLAGS":
                flags_str = value.decode("utf-8", errors="replace") if isinstance(value, bytes) else str(value)
                flags = [f.strip() for f in flags_str.strip("()").split()]

            if isinstance(key, bytes) and key.upper() == b"RFC822":
                raw_email = value if isinstance(value, bytes) else value.encode()

    if not raw_email:
        return None

    detail = parse_message(raw_email, uid, seq, flags)
    return detail


async def search_messages(
    imap,
    folder: str = "INBOX",
    query: str = "",
    page: int = 1,
    page_size: int = 50,
    date_from: str | None = None,
    date_to: str | None = None,
    unread_only: bool = False,
) -> tuple[list[MessageSummary], int]:
    """搜索邮件 (支持文本搜索 + 日期/未读筛选)."""
    await imap.noop()
    await imap.select(folder)

    # 构建 IMAP SEARCH 条件
    criteria = []
    if query:
        criteria.append('TEXT "{}"'.format(query.replace('"', '')))
    if date_from:
        criteria.append(f"SINCE {date_from}")
    if date_to:
        criteria.append(f"BEFORE {date_to}")
    if unread_only:
        criteria.append("UNSEEN")

    if criteria:
        search_cmd = " ".join(criteria)
    else:
        search_cmd = "ALL"

    typ, data = await imap.search(search_cmd)
    if typ != "OK" or not data or not data[0]:
        return [], 0

    all_uids = [int(uid) for uid in data[0].decode("utf-8", errors="replace").split()]
    total = len(all_uids)

    # 按时间降序
    all_uids.reverse()

    start = (page - 1) * page_size
    end = min(start + page_size, total)
    if start >= total:
        return [], total

    page_uids = all_uids[start:end]
    uid_set = ",".join(str(uid) for uid in page_uids)

    typ, fetch_data = await imap.uid("FETCH", uid_set, FETCH_HEADERS)
    if typ != "OK":
        return [], total

    messages: list[MessageSummary] = []
    for response_data in fetch_data:
        if not isinstance(response_data, tuple):
            continue
        seq = response_data[0]
        raw_data = response_data[1]
        if not isinstance(raw_data, list):
            continue

        uid = 0
        for pair in raw_data:
            if isinstance(pair, tuple) and len(pair) >= 1:
                key = pair[0]
                if isinstance(key, bytes) and key.upper() == b"UID":
                    uid = int(pair[1]) if isinstance(pair[1], (int, bytes)) else 0
                    break
        if uid == 0:
            continue

        summary = parse_summary(raw_data, uid, seq)
        messages.append(summary)

    return messages, total


async def mark_as_read(imap, folder: str, uid: int) -> bool:
    """标记邮件为已读."""
    try:
        await imap.select(folder)
        await imap.uid("STORE", str(uid), "+FLAGS", "(\\Seen)")
        return True
    except Exception as e:
        logger.error("标记已读失败 %s:%d: %s", folder, uid, e)
        return False


async def mark_as_unread(imap, folder: str, uid: int) -> bool:
    """标记邮件为未读."""
    try:
        await imap.select(folder)
        await imap.uid("STORE", str(uid), "-FLAGS", "(\\Seen)")
        return True
    except Exception as e:
        logger.error("标记未读失败 %s:%d: %s", folder, uid, e)
        return False


async def move_message(imap, folder: str, uid: int, target_folder: str) -> bool:
    """移动邮件到其他文件夹."""
    try:
        await imap.select(folder)
        await imap.uid("MOVE", str(uid), target_folder)
        return True
    except Exception as e:
        logger.error("移动邮件失败 %s:%d → %s: %s", folder, uid, target_folder, e)
        return False


async def copy_message(imap, folder: str, uid: int, target_folder: str) -> bool:
    """复制邮件到其他文件夹."""
    try:
        await imap.select(folder)
        await imap.uid("COPY", str(uid), target_folder)
        return True
    except Exception as e:
        logger.error("复制邮件失败 %s:%d → %s: %s", folder, uid, target_folder, e)
        return False


async def delete_message(imap, folder: str, uid: int, expunge: bool = True) -> bool:
    """删除邮件 (标记 Deleted + EXPUNGE)."""
    try:
        await imap.select(folder)
        await imap.uid("STORE", str(uid), "+FLAGS", "(\\Deleted)")
        if expunge:
            await imap.expunge()
        return True
    except Exception as e:
        logger.error("删除邮件失败 %s:%d: %s", folder, uid, e)
        return False


async def fetch_attachment(
    imap,
    folder: str,
    uid: int,
    part_id: str,
) -> bytes | None:
    """获取邮件指定附件的原始字节."""
    try:
        await imap.select(folder)
        # BODY.PEEK[] 用于获取指定 MIME part
        typ, data = await imap.uid("FETCH", str(uid), f"(BODY.PEEK[{part_id}])")
        if typ != "OK" or not data:
            return None

        raw_data = b""
        for response_data in data:
            if not isinstance(response_data, tuple):
                continue
            pairs = response_data[1] if len(response_data) > 1 else []
            if not isinstance(pairs, list):
                if isinstance(pairs, bytes):
                    raw_data = pairs
                continue
            for pair in pairs:
                if not isinstance(pair, tuple):
                    if isinstance(pair, bytes) and len(pair) > 0:
                        raw_data = pair
                    continue
                val = pair[1] if len(pair) > 1 else b""
                if isinstance(val, bytes) and len(val) > 0:
                    raw_data = val

        return raw_data if raw_data else None
    except Exception as e:
        logger.error("获取附件失败 %s:%d part=%s: %s", folder, uid, part_id, e)
        return None
