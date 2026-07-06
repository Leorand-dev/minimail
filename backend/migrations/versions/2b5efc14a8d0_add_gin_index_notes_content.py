"""add GIN index on notes.content for full-text search

Revision ID: 2b5efc14a8d0
Revises: bd95417b2fd7
Create Date: 2026-07-07 00:30:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "2b5efc14a8d0"
down_revision: Union[str, None] = "bd95417b2fd7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # GIN index on tsvector for full-text search performance
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_notes_content_tsv "
        "ON notes USING gin (to_tsvector('simple', coalesce(content, '')))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_notes_content_tsv")
