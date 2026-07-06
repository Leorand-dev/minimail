"""add notes tables

Revision ID: bd95417b2fd7
Revises: a58e0f42a5f6
Create Date: 2026-07-06 23:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ARRAY


revision: str = 'bd95417b2fd7'
down_revision: Union[str, None] = 'a58e0f42a5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### notes ###
    op.create_table(
        'notes',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('visibility', sa.String(16), nullable=False, server_default='private'),
        sa.Column('pinned', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('parent_id', UUID(as_uuid=True), nullable=True),
        sa.Column('row_status', sa.String(16), nullable=False, server_default='active'),
        sa.Column('tags', ARRAY(sa.String(64)), nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['parent_id'], ['notes.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notes_user_id', 'notes', ['user_id'])
    op.create_index('ix_notes_created_at', 'notes', ['created_at'])

    # 全文搜索 GIN 索引 (tsvector)
    op.execute(
        "CREATE INDEX ix_notes_content_tsv ON notes "
        "USING gin (to_tsvector('simple', coalesce(content, '')))"
    )

    # ### note_tags ###
    op.create_table(
        'note_tags',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(64), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('note_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', 'user_id', name='uq_note_tag_name_user'),
    )
    op.create_index('ix_note_tags_user_id', 'note_tags', ['user_id'])

    # ### note_reactions ###
    op.create_table(
        'note_reactions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('note_id', UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('emoji', sa.String(32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['note_id'], ['notes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('note_id', 'user_id', 'emoji', name='uq_note_reaction'),
    )


def downgrade() -> None:
    op.drop_table('note_reactions')
    op.drop_table('note_tags')
    op.execute("DROP INDEX IF EXISTS ix_notes_content_tsv")
    op.drop_table('notes')
