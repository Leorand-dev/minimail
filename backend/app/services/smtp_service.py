"""
Minimail — SMTP 邮件发送服务

使用 aiosmtplib 异步发送邮件，支持 SSL/TLS/STARTTLS。
"""

from __future__ import annotations

import email.mime.application
import email.mime.base
import email.mime.image
import email.mime.multipart
import email.mime.text
import email.utils
import logging
import mimetypes
import uuid
from email import encoders
from email.header import Header

import aiosmtplib

from app.models.user import User

logger = logging.getLogger("minimail.smtp")

SMTP_TIMEOUT = 30


class SmtpError(Exception):
    """SMTP 发送异常."""


def _encoded_header(value: str) -> str:
    """对非 ASCII 文本进行 RFC 2047 编码."""
    try:
        value.encode("ascii")
        return value
    except (UnicodeEncodeError, UnicodeDecodeError):
        return Header(value, "utf-8").encode()


def _build_message(
    from_addr: str,
    to_addrs: list[str],
    subject: str,
    text_body: str = "",
    html_body: str = "",
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    reply_to: str | None = None,
    in_reply_to: str | None = None,
    attachments: list[dict] | None = None,
) -> email.mime.multipart.MIMEMultipart:
    """构建 MIME 多部分邮件消息."""
    msg = email.mime.multipart.MIMEMultipart("alternative")
    msg["From"] = from_addr
    msg["To"] = ", ".join(to_addrs)
    msg["Subject"] = _encoded_header(subject)
    msg["Date"] = email.utils.formatdate(localtime=True)
    msg["Message-ID"] = f"<{uuid.uuid4().hex}@minimail.local>"
    msg["MIME-Version"] = "1.0"

    if cc:
        msg["Cc"] = ", ".join(cc)
    if reply_to:
        msg["Reply-To"] = reply_to
    if in_reply_to:
        msg["In-Reply-To"] = in_reply_to

    # text/plain part
    if text_body:
        msg.attach(email.mime.text.MIMEText(text_body, "plain", "utf-8"))

    # text/html part
    if html_body:
        msg.attach(email.mime.text.MIMEText(html_body, "html", "utf-8"))

    if not text_body and not html_body:
        msg.attach(email.mime.text.MIMEText("", "plain", "utf-8"))

    # Attachments — switch to mixed if there are any
    if attachments:
        mixed = email.mime.multipart.MIMEMultipart("mixed")
        # Copy headers from original msg
        for key in msg.keys():
            mixed[key] = msg[key]
        # Attach the original alternative as the first part
        mixed.attach(msg)

        for att in attachments:
            filename = att.get("filename", "attachment")
            content = att.get("content", b"")
            mimetype = att.get("mimetype") or mimetypes.guess_type(filename)[0] or "application/octet-stream"

            maintype, subtype = mimetype.split("/", 1)
            if maintype == "image":
                part = email.mime.image.MIMEImage(content, _subtype=subtype)
            elif maintype == "text":
                part = email.mime.text.MIMEText(
                    content.decode("utf-8", errors="replace") if isinstance(content, bytes) else content,
                    _subtype=subtype,
                    _charset="utf-8",
                )
            else:
                part = email.mime.application.MIMEApplication(content, _subtype=subtype)

            part.add_header("Content-Disposition", "attachment", filename=_encoded_header(filename))
            encoders.encode_base64(part)
            mixed.attach(part)

        return mixed

    return msg


async def send_email(
    user: User,
    from_addr: str,
    to_addrs: list[str],
    subject: str,
    text_body: str = "",
    html_body: str = "",
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    reply_to: str | None = None,
    in_reply_to: str | None = None,
    attachments: list[dict] | None = None,
    # SMTP 配置覆盖 (多账户支持)
    _smtp_host: str | None = None,
    _smtp_port: int | None = None,
    _smtp_ssl: bool | None = None,
    _smtp_username: str | None = None,
    _smtp_password: str | None = None,
) -> dict:
    """
    通过用户的 SMTP 配置发送邮件。

    Returns:
        {"message_id": str, "response": str}
    """
    # 使用传入的 SMTP 配置 (多账户) 或回退到用户配置
    smtp_host = _smtp_host or user.smtp_host
    smtp_port = _smtp_port or user.smtp_port or 465
    smtp_ssl = _smtp_ssl if _smtp_ssl is not None else user.smtp_ssl
    smtp_username = _smtp_username or user.smtp_username or user.email
    smtp_password = _smtp_password or ""

    if not smtp_host:
        raise SmtpError("SMTP 未配置")

    # 如果没传密码 (从账户来的直接是明文), 且需要从 user 解密
    if _smtp_password is None and user.smtp_password_enc:
        from app.services.email_account import _decrypt_password
        try:
            smtp_password = _decrypt_password(user.smtp_password_enc)
        except Exception:
            smtp_password = user.smtp_password_enc or ""

    # Build message
    msg = _build_message(
        from_addr=from_addr or user.email,
        to_addrs=to_addrs,
        subject=subject,
        text_body=text_body,
        html_body=html_body,
        cc=cc,
        bcc=bcc,
        reply_to=reply_to,
        in_reply_to=in_reply_to,
        attachments=attachments,
    )

    all_recipients = list(to_addrs)
    if cc:
        all_recipients.extend(cc)
    if bcc:
        all_recipients.extend(bcc)

    try:
        if smtp_ssl:
            # SSL 模式 (默认端口 465)
            response = await aiosmtplib.send(
                msg,
                hostname=smtp_host,
                port=smtp_port or 465,
                username=smtp_username,
                password=smtp_password,
                use_tls=True,
                timeout=SMTP_TIMEOUT,
            )
        else:
            # STARTTLS 模式 (默认端口 587)
            response = await aiosmtplib.send(
                msg,
                hostname=smtp_host,
                port=smtp_port or 587,
                username=smtp_username,
                password=smtp_password,
                start_tls=True,
                timeout=SMTP_TIMEOUT,
            )

        message_id = msg["Message-ID"]
        logger.info("邮件发送成功: %s -> %s (%s)", from_addr, to_addrs, message_id)
        return {"message_id": message_id, "response": str(response)}

    except aiosmtplib.SMTPException as e:
        logger.error("SMTP 发送失败: %s", e)
        raise SmtpError(f"SMTP 发送失败: {e}")
    except Exception as e:
        logger.error("SMTP 发送异常: %s", e)
        raise SmtpError(f"SMTP 发送异常: {e}")
