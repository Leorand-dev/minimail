-- PostgreSQL init script for Webmail
-- Creates the pgvector extension and database

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schema will be created by Alembic migrations
-- This file runs once at container first-start
