"""
Minimail — 示例邮件数据 (用于 UI 展示).

当 IMAP 连接不可用时, 提供示例数据供前端渲染.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta

from app.imap.types import MessageSummary, Address


def get_demo_messages(user_id: str) -> list[MessageSummary]:
    """返回示例邮件列表."""
    now = datetime.now(timezone.utc)

    return [
        MessageSummary(
            uid=101, seq=1, flags=[], size=18640,
            date=now - timedelta(minutes=5),
            subject="🎉 欢迎使用 Minimail — 您的智能邮件系统！",
            from_=Address(name="Minimail Team", email="welcome@minimail.app"),
            to=[Address(name="Demo User", email="demo@example.com")],
            has_attachments=False,
            preview="欢迎使用 Minimail！这是一封系统欢迎信，帮助您快速了解各项功能。",
            is_read=False,
        ),
        MessageSummary(
            uid=102, seq=2, flags=[], size=2840,
            date=now - timedelta(hours=2),
            subject="项目进度周报 — 2026年第27周",
            from_=Address(name="张三", email="zhangsan@example.com"),
            to=[Address(name="Demo User", email="demo@example.com")],
            has_attachments=True,
            preview="各位好，以下是本周工作进展：前端改版已完成85%，后端API全部通过测试...",
            is_read=False,
        ),
        MessageSummary(
            uid=103, seq=3, flags=["\\Seen"], size=12500,
            date=now - timedelta(days=1),
            subject="Re: 会议邀请：产品需求评审",
            from_=Address(name="李四", email="lisi@example.com"),
            to=[Address(name="Demo User", email="demo@example.com")],
            has_attachments=False,
            preview="收到，我会准时参加。另外我整理了一些需求文档，见附件。",
            is_read=True,
        ),
        MessageSummary(
            uid=104, seq=4, flags=["\\Seen"], size=3200,
            date=now - timedelta(days=1, hours=5),
            subject="会议邀请：产品需求评审",
            from_=Address(name="王五", email="wangwu@example.com"),
            to=[Address(name="Demo User", email="demo@example.com")],
            has_attachments=False,
            preview="大家好，定于本周四下午2点进行产品需求评审，请各位准时参加。",
            is_read=True,
        ),
        MessageSummary(
            uid=105, seq=5, flags=["\\Seen", "\\Flagged"], size=8900,
            date=now - timedelta(days=2),
            subject="GitHub PR #284 代码审查请求",
            from_=Address(name="GitHub", email="notifications@github.com"),
            to=[Address(name="Demo User", email="demo@example.com")],
            has_attachments=False,
            preview="@demo 请求您审查 PR #284: feat: 添加附件拖拽上传功能",
            is_read=True,
        ),
        MessageSummary(
            uid=201, seq=1, flags=["\\Seen"], size=5600,
            date=now - timedelta(days=2, hours=12),
            subject="新版本发布 v0.11.0",
            from_=Address(name="DevOps Bot", email="ci@minimail.app"),
            to=[Address(name="Demo User", email="demo@example.com")],
            has_attachments=False,
            preview="Minimail v0.11.0 已发布。变更：Phase5 邮件→笔记功能、Reaction、评论系统。",
            is_read=True,
        ),
    ]
