"""add pgvector embedding column and ivfflat index

Revision ID: 3a5efc14b8e0
Revises: 2b5efc14a8d0
Create Date: 2026-07-07 01:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from pgvector.sqlalchemy import Vector


revision: str = "3a5efc14b8e0"
down_revision: Union[str, None] = "2b5efc14a8d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # pgvector 扩展 (假设已在数据库层创建)
    # 添加 embedding 列 (1536 维, 适配 OpenAI 等主流 embedding 模型)
    op.add_column(
        "notes",
        sa.Column("embedding", Vector(1536), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notes", "embedding")
