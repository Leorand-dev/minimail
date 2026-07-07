"""
Webmail — IMAP 类型定义
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class Flag(str, Enum):
    SEEN = "\\Seen"
    ANSWERED = "\\Answered"
    FLAGGED = "\\Flagged"
    DELETED = "\\Deleted"
    DRAFT = "\\Draft"
    RECENT = "\\Recent"


class Folder(BaseModel):
    name: str
    delim: str
    flags: list[str]
    subscribed: bool = False
    exists: int = 0
    unseen: int = 0
    recent: int = 0

    @property
    def hierarchy(self) -> list[str]:
        return self.name.split(self.delim) if self.delim else [self.name]

    @property
    def is_container(self) -> bool:
        return "\\Noselect" in self.flags or "\\HasChildren" in self.flags


class Address(BaseModel):
    name: str = ""
    email: str = ""


class Attachment(BaseModel):
    filename: str
    mimetype: str
    size: int
    part_id: str  # IMAP BODY[] part reference


class MessageSummary(BaseModel):
    uid: int
    seq: int
    flags: list[str]
    size: int
    date: datetime
    subject: str = ""
    from_: Address | list[Address] = Address(email="")
    to: list[Address] = []
    cc: list[Address] = []
    has_attachments: bool = False
    preview: str = ""
    is_read: bool = True


class MessageDetail(BaseModel):
    uid: int
    seq: int
    flags: list[str]
    date: datetime
    subject: str
    from_: Address | list[Address]
    to: list[Address]
    cc: list[Address] = []
    bcc: list[Address] = []
    reply_to: list[Address] = []
    in_reply_to: str = ""
    message_id: str = ""
    references: list[str] = []
    text_plain: str = ""
    text_html: str = ""
    attachments: list[Attachment] = []
    inline_images: list[Attachment] = []
    size: int = 0
    priority: int = 3  # 1=high, 3=normal, 5=low
