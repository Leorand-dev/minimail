"""create users table

Revision ID: a58e0f42a5f6
Revises:
Create Date: 2026-07-06 15:23:05.883792
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'a58e0f42a5f6'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(320), unique=True, index=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(128), nullable=False, server_default=""),

        # IMAP
        sa.Column("imap_host", sa.String(255), nullable=True),
        sa.Column("imap_port", sa.Integer(), nullable=False, server_default="993"),
        sa.Column("imap_ssl", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("imap_username", sa.String(320), nullable=True),
        sa.Column("imap_password_enc", sa.String(512), nullable=True),

        # SMTP
        sa.Column("smtp_host", sa.String(255), nullable=True),
        sa.Column("smtp_port", sa.Integer(), nullable=False, server_default="465"),
        sa.Column("smtp_ssl", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("smtp_username", sa.String(320), nullable=True),
        sa.Column("smtp_password_enc", sa.String(512), nullable=True),

        # 偏好
        sa.Column("language", sa.String(10), nullable=False, server_default="zh_CN"),
        sa.Column("theme", sa.String(20), nullable=False, server_default="light"),
        sa.Column("messages_per_page", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("preview_pane", sa.Boolean(), nullable=False, server_default="true"),

        # 配额
        sa.Column("quota_mb", sa.Integer(), nullable=False, server_default="0"),

        # 元数据
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("users")
