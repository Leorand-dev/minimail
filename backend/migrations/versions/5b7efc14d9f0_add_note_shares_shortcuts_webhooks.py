"""add note_shares, note_shortcuts, note_webhooks tables + note_allow_shares column

Revision ID: 5b7efc14d9f0
Revises: 4a6efc14c8f0
Create Date: 2026-07-07 03:30:00.000000
"""

from typing import Sequence, Union

from alembic import op


revision: str = "5b7efc14d9f0"
down_revision: Union[str, None] = "4a6efc14c8f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS note_allow_shares BOOLEAN NOT NULL DEFAULT TRUE")

    op.execute("CREATE TABLE IF NOT EXISTS note_shares ("
               "id UUID NOT NULL PRIMARY KEY, "
               "note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE, "
               "user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, "
               "token VARCHAR(64) NOT NULL UNIQUE, "
               "expires_at TIMESTAMP WITH TIME ZONE, "
               "created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL)")
    op.create_index("ix_note_shares_note_id", "note_shares", ["note_id"])
    op.create_index("ix_note_shares_token", "note_shares", ["token"])

    op.execute("CREATE TABLE IF NOT EXISTS note_shortcuts ("
               "id UUID NOT NULL PRIMARY KEY, "
               "user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, "
               "name VARCHAR(64) NOT NULL, "
               "icon VARCHAR(8) DEFAULT '🔖', "
               "filter_tag VARCHAR(64) DEFAULT '', "
               "filter_visibility VARCHAR(16) DEFAULT '', "
               "sort_order INTEGER DEFAULT 0, "
               "created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL)")
    op.create_index("ix_note_shortcuts_user_id", "note_shortcuts", ["user_id"])

    op.execute("CREATE TABLE IF NOT EXISTS note_webhooks ("
               "id UUID NOT NULL PRIMARY KEY, "
               "user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, "
               "url VARCHAR(1024) NOT NULL, "
               "events VARCHAR(32)[] NOT NULL, "
               "enabled BOOLEAN DEFAULT TRUE, "
               "secret VARCHAR(128) DEFAULT '', "
               "created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL)")
    op.create_index("ix_note_webhooks_user_id", "note_webhooks", ["user_id"])


def downgrade() -> None:
    op.drop_table("note_webhooks")
    op.drop_table("note_shortcuts")
    op.drop_table("note_shares")
    op.drop_column("users", "note_allow_shares")
