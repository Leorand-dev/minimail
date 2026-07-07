"""add note_attachments table

Revision ID: 4a6efc14c8f0
Revises: 3a5efc14b8e0
Create Date: 2026-07-07 02:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = "4a6efc14c8f0"
down_revision: Union[str, None] = "3a5efc14b8e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "note_attachments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("note_id", UUID(as_uuid=True), sa.ForeignKey("notes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("filename", sa.String(256), nullable=False),
        sa.Column("filepath", sa.String(512), nullable=False),
        sa.Column("size", sa.Integer(), default=0),
        sa.Column("mime_type", sa.String(128), default="application/octet-stream"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("note_attachments")
