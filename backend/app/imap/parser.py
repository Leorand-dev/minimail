"""
Webmail — MIME 邮件解析器

将 IMAP FETCH 返回的原始邮件解析为结构化数据。
"""

from __future__ import annotations

import email
import email.header
import email.utils
import quopri
import re
from datetime import datetime, timezone
from email.mime.base import MIMEBase
from typing import Optional

from app.imap.types import Address, Attachment, MessageDetail, MessageSummary


def _decode_header(value: str | bytes | None) -> str:
    """解码邮件头 (支持 RFC 2047 encoded words)."""
    if value is None:
        return ""
    if isinstance(value, bytes):
        value = value.decode("utf-8", errors="replace")
    decoded_parts = []
    for part, charset in email.header.decode_header(value):
        if isinstance(part, bytes):
            try:
                decoded_parts.append(part.decode(charset or "utf-8", errors="replace"))
            except (LookupError, UnicodeDecodeError):
                decoded_parts.append(part.decode("utf-8", errors="replace"))
        else:
            decoded_parts.append(str(part))
    return " ".join(decoded_parts)


def _parse_address(raw: str) -> list[Address]:
    """解析邮件地址头."""
    result: list[Address] = []
    for name, addr in email.utils.getaddresses([raw or ""]):
        if addr:
            result.append(
                Address(
                    name=_decode_header(name),
                    email=addr,
                )
            )
    return result


def _parse_date(date_str: str | None) -> datetime:
    """解析邮件日期."""
    if not date_str:
        return datetime.now(timezone.utc)
    try:
        dt = email.utils.parsedate_to_datetime(date_str)
        if dt and dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt or datetime.now(timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def _get_mime_part_text(part, subtype: str = "plain") -> str:
    """从 MIME 部分提取纯文本/html."""
    if part.get_content_maintype() == "text" and part.get_content_subtype() == subtype:
        payload = part.get_payload(decode=True)
        if payload:
            charset = part.get_content_charset() or "utf-8"
            try:
                return payload.decode(charset, errors="replace")
            except (LookupError, UnicodeDecodeError):
                return payload.decode("utf-8", errors="replace")
    return ""


def _collect_parts(
    part,
    text_plain: list[str],
    text_html: list[str],
    attachments: list[Attachment],
    inline_images: list[Attachment],
) -> None:
    """递归遍历 MIME 部件."""
    maintype = part.get_content_maintype()
    subtype = part.get_content_subtype()
    content_id = part.get("Content-ID", "")
    disposition = part.get("Content-Disposition", "")

    if maintype == "text":
        text = _get_mime_part_text(part, subtype)
        if text:
            if subtype == "plain":
                text_plain.append(text)
            elif subtype == "html":
                # 清理 HTML 中引用的内容
                if "type=\"cite\"" not in text:
                    text_html.append(text)

    elif maintype == "multipart":
        for subpart in part.get_payload():
            if isinstance(subpart, MIMEBase):
                _collect_parts(subpart, text_plain, text_html, attachments, inline_images)

    else:
        # 附件或内联图片
        filename = part.get_filename()
        if not filename:
            filename = content_id.strip("<>") or f"part-{len(attachments)}"

        filename = _decode_header(filename)
        mimetype = f"{maintype}/{subtype}" if subtype else "application/octet-stream"
        size = len(part.as_bytes()) if part.get_payload(decode=True) else 0

        att = Attachment(
            filename=filename,
            mimetype=mimetype,
            size=size,
            part_id=content_id.strip("<>") if content_id else filename,
        )

        if "inline" in disposition.lower() and maintype in ("image",):
            inline_images.append(att)
        elif "attachment" in disposition.lower() or maintype not in ("image",):
            attachments.append(att)
        elif maintype == "image" and not content_id:
            # 无 CID 的图片附件
            attachments.append(att)


def parse_message(raw_bytes: bytes, uid: int, seq: int, flags: list[str]) -> MessageDetail:
    """解析 IMAP FETCH 返回的字节流为结构化邮件."""
    msg = email.message_from_bytes(raw_bytes)

    text_plain: list[str] = []
    text_html: list[str] = []
    attachments: list[Attachment] = []
    inline_images: list[Attachment] = []

    _collect_parts(msg, text_plain, text_html, attachments, inline_images)

    return MessageDetail(
        uid=uid,
        seq=seq,
        date=_parse_date(msg.get("Date")),
        subject=_decode_header(msg.get("Subject", "")),
        from_=_parse_address(msg.get("From", "")),
        to=_parse_address(msg.get("To", "")),
        cc=_parse_address(msg.get("Cc", "")),
        bcc=_parse_address(msg.get("Bcc", "")),
        reply_to=_parse_address(msg.get("Reply-To", "")),
        in_reply_to=msg.get("In-Reply-To", "") or "",
        message_id=msg.get("Message-ID", "") or "",
        references=[r.strip() for r in (msg.get("References", "") or "").split() if r.strip()],
        text_plain="\n".join(text_plain),
        text_html="\n".join(text_html),
        attachments=attachments,
        inline_images=inline_images,
        flags=flags,
        size=len(raw_bytes),
    )


def extract_preview(text_plain: str, max_len: int = 200) -> str:
    """提取邮件预览文本."""
    if not text_plain:
        return ""
    # 移除引用内容
    lines = text_plain.split("\n")
    clean_lines = []
    for line in lines:
        if line.startswith(">") or line.startswith("On ") and "wrote:" in line:
            break
        clean_lines.append(line)
    preview = " ".join(clean_lines).strip()
    # 清洗多余空白
    preview = re.sub(r"\s+", " ", preview)
    if len(preview) > max_len:
        preview = preview[:max_len].rstrip() + "..."
    return preview


def parse_summary(imap_data: list[tuple], uid: int, seq: int) -> MessageSummary:
    """从 IMAP FETCH 结果解析邮件摘要."""
    flags: list[str] = []
    size = 0
    date = datetime.now(timezone.utc)
    subject = ""
    from_ = Address(email="")
    to: list[Address] = []
    has_attachments = False

    for key, value in imap_data:
        if isinstance(value, list):
            value = b" ".join(value) if value else b""
        if isinstance(value, bytes):
            try:
                value_str = value.decode("utf-8", errors="replace")
            except Exception:
                value_str = str(value)
        else:
            value_str = str(value)

        key_str = key.decode("ascii", errors="replace") if isinstance(key, bytes) else str(key)
        key_upper = key_str.upper()

        if key_upper == "FLAGS":
            flags = _parse_flags_str(value_str)
        elif key_upper == "RFC822.SIZE":
            try:
                size = int(value_str)
            except ValueError:
                size = 0
        elif key_upper == "INTERNALDATE":
            try:
                dt = email.utils.parsedate_to_datetime(value_str)
                if dt:
                    date = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
            except Exception:
                pass
        elif key_upper == "BODY[HEADER.FIELDS (SUBJECT FROM TO CC DATE)]":
            # 解析头部块
            header_msg = email.message_from_bytes(value if isinstance(value, bytes) else value.encode())
            subject = _decode_header(header_msg.get("Subject", ""))
            from_ = _parse_address(header_msg.get("From", ""))[0] if _parse_address(header_msg.get("From", "")) else Address(email="")
            to = _parse_address(header_msg.get("To", ""))
            dt = header_msg.get("Date")
            if dt:
                try:
                    parsed = email.utils.parsedate_to_datetime(dt)
                    if parsed:
                        date = parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed
                except Exception:
                    pass
        elif key_upper == "BODYSTRUCTURE":
            has_attachments = "attachment" in value_str.lower() or "mixed" in value_str.lower()

    # is_read
    is_read = "\\Seen" in flags

    # Preview will be filled separately
    preview = ""

    return MessageSummary(
        uid=uid,
        seq=seq,
        flags=flags,
        size=size,
        date=date,
        subject=subject,
        from_=from_,
        to=to,
        has_attachments=has_attachments,
        preview=preview,
        is_read=is_read,
    )


def _parse_flags_str(value_str: str) -> list[str]:
    """解析 FLAGS 字符串."""
    flags = []
    for part in value_str.strip("()").split():
        part = part.strip()
        if part.startswith("\\"):
            flags.append(part)
    return flags
