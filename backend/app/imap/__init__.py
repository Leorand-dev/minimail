"""
Webmail — IMAP 协议层
"""

from app.imap.connection import get_connection, close_connection, close_all, managed_connection
from app.imap.folder import list_folders, create_folder, delete_folder, rename_folder
from app.imap.message import fetch_messages, fetch_message_detail, search_messages
from app.imap.message import mark_as_read, mark_as_unread, move_message, copy_message, delete_message
from app.imap.types import Folder, MessageSummary, MessageDetail, Address, Attachment, Flag

__all__ = [
    "get_connection",
    "close_connection",
    "close_all",
    "managed_connection",
    "list_folders",
    "create_folder",
    "delete_folder",
    "rename_folder",
    "fetch_messages",
    "fetch_message_detail",
    "search_messages",
    "mark_as_read",
    "mark_as_unread",
    "move_message",
    "copy_message",
    "delete_message",
    "Folder",
    "MessageSummary",
    "MessageDetail",
    "Address",
    "Attachment",
    "Flag",
]
