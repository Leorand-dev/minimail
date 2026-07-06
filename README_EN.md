# Minimail — AI Agent-Driven Email & Knowledge Management Platform

> Integrates **Email** · **Notes** · **Knowledge Base** into one unified platform with a single **Agent API** for AI agents to operate everything autonomously.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

---

## 📌 Overview

Minimail is a full-stack platform built for the **AI Agent era**, centered around email and expanding into a personal knowledge management hub:

- **📧 Email System** — Full-featured IMAP/SMTP webmail client (Roundcube-inspired)
- **📝 Notes** — Markdown-native note-taking with tags, search, pinning, and archiving
- **🧠 Knowledge Base** — Note content vectorized and semantically searchable by AI agents
- **🤖 Agent API** — Unified REST API for AI agents to operate all features via API keys

AI agents (Hermes / Claude Code / OpenAI Codex / etc.) are **first-class citizens** of Minimail — not just humans, but agents can also read emails, write notes, and search knowledge through the API.

---

## 🔥 AI Agent Integration

Every feature in Minimail is exposed through a REST API, protected by a **unified API key system**. An agent with a key can handle daily tasks autonomously.

### Agent Capability Matrix

| Domain | Capability | API Endpoint |
|--------|-----------|--------------|
| 📥 **Email** | Read / search / send / delete / move | `GET/POST /api/mail/*` |
| 📝 **Notes** | Create / query / search / update / archive | `GET/POST/PUT/DELETE /api/notes/*` |
| 🔍 **Knowledge Retrieval** | Full-text search + semantic vector search | `GET /api/notes/search`, `POST /api/notes/search/semantic` |
| 👤 **Contacts** | Contact CRUD | `GET/POST/PUT/DELETE /api/contacts/*` |
| 🔑 **Self-Management** | API key creation / revocation | `POST/DELETE /api/auth/tokens` |

### Agent Workflow Examples

```bash
# 1. Agent logs in and obtains a token
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -d '{"email":"agent@example.com","password":"***"}' \
  -H "Content-Type: application/json" | jq -r '.access_token')

# 2. Agent reads the inbox
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/mail/messages?folder=INBOX

# 3. Agent records a decision in the notes library
curl -s -X POST http://localhost:8000/api/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Architecture Decision Record\n\n## 2026-07-06 Database Selection\n\nChose PostgreSQL 16 because...",
    "tags": ["adr", "database"]
  }'

# 4. Agent performs a semantic search across notes
curl -s -X POST http://localhost:8000/api/notes/search/semantic \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "How to configure IMAP connection", "top_k": 3}'
```

### Authentication

```
Authorization: Bearer <api-token>    # Agent bearer token
X-API-Key: wm_xxx                    # Or API key header
```

An agent with a valid token has the **same permission model** as the web user — no additional configuration needed.

---

## ✨ Features

### 📧 Email System

| Feature | Description |
|---------|-------------|
| **Three-Panel Layout** | Folder tree → Message list → Preview pane, with unified multi-account inbox |
| **IMAP Support** | Connection pool, SSL/TLS, multi-account parallel connections, folder subscription, folder CRUD |
| **SMTP Sending** | Rich text editor (TipTap), HTML emails, attachments, reply/reply-all/forward |
| **Search** | Keyword highlighting, date range filter, unread-only filter | 📋 |
| **Attachment Management** | Click-to-download from preview pane, drag-and-drop upload | 📋 |
| **Reply/Forward** | One-click reply / reply-all / forward with auto-filled recipients and quoted text |
| **Conversation View** | Threaded messages grouped by subject, collapsible | 📋 |
| **Account Setup Wizard** | Auto-detect IMAP/SMTP settings | 📋 |
| **Multi-Account** | Multiple email accounts, independent IMAP/SMTP config, unified inbox aggregation |
| **Contacts** | Contact CRUD, group management, debounced search, compose autocomplete |
| **IMAP Status** | Live connection status, last sync time, manual refresh |
| **Notifications** | WebSocket / SSE real-time new-email alerts | 📋 |
| **Full-Text Search** | PostgreSQL tsvector or pgvector semantic search | 📋 |

### 📝 Notes — Architecture derived from [Memos](https://github.com/usememos/memos)

| Feature | Description |
|---------|-------------|
| **Markdown Editor** | TipTap WYSIWYG + Markdown source dual mode |
| **Timeline** | Reverse chronological card-style list |
| **Tag System** | `#tag` auto-extraction, sidebar filter |
| **Pin/Archive** | Pin important notes, archived notes recoverable |
| **Visibility** | Private / Public two-level control |
| **AI Semantic Search** | Note vectorization, agent-searchable |
| **Comments / Threads** | Nested comments under notes | 📋 |
| **Attachments** | Drag-and-drop images / files into notes | 📋 |
| **Reactions** | Emoji reactions | 📋 |
| **@Mentions** | `@contact` autocomplete in editor, linked to address book | 📋 |
| **Shortcuts** | Save filter conditions as sidebar shortcuts | 📋 |
| **RSS Feed** | Public note RSS subscription | 📋 |

### 🔗 Knowledge Base

| Feature | Description |
|---------|-------------|
| **Full-Text Search** | PostgreSQL tsvector with Chinese word segmentation |
| **Semantic Search** | pgvector index + embedding model (P1) |
| **Agent Context** | Agents auto-retrieve notes as reference during conversations |
| **Email → Note** | One-click conversion of emails to notes (P2) |

### 🛡️ Agent API

| Feature | Description |
|---------|-------------|
| **Unified Auth** | JWT + API key dual channel |
| **Full Feature Exposure** | Email / notes / contacts / settings all API-accessible |
| **Scope Control** | API keys can be restricted by permission scope |
| **Webhook** | Event notifications (email arrival, note updates) | 📋 |
| **MCP Protocol** | Native Model Context Protocol support | 📋 |

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/Leorand-dev/minimail.git
cd minimail

# Start databases
docker compose -f docker/docker-compose.yml up -d postgres redis

# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd ../frontend
npm install
npx vite --host 0.0.0.0 --port 5173
```

Visit **http://localhost:5173** → Register an account → Start using.

---

## 🧰 Tech Stack

| Layer | Choice |
|-------|--------|
| Backend Framework | **FastAPI** (Python 3.11+, async) |
| ORM | **SQLAlchemy 2.0** (async) + Alembic |
| Database | **PostgreSQL 16** + pgvector (semantic search) |
| Vector Search | **pgvector** (`ivfflat` index) (P1) |
| Embedding Model | LLM inference endpoint (configurable) |
| Cache | Redis 7 (optional) |
| Frontend | **React 19** + **TypeScript 5** + **Vite 6** |
| Styling | **Tailwind CSS 4** |
| State Management | **Zustand** |
| Email Protocols | aioimaplib (IMAP), aiosmtplib (SMTP) |
| Encryption | Fernet (symmetric) |
| Auth | JWT (dual token: access + refresh) + API Key |
| Deployment | Docker Compose |

---

## 📂 Project Structure

```
minimail/
├── backend/                           # FastAPI async backend
│   └── app/
│       ├── api/                       # REST routes
│       │   ├── auth.py               # Authentication
│       │   ├── mail.py               # Email (IMAP/SMTP)
│       │   ├── memos.py              # Notes CRUD + search
│       │   ├── contacts.py           # Address book
│       │   ├── email_accounts.py     # Email account management
│       │   ├── api_tokens.py         # API keys
│       │   └── settings.py           # System settings
│       ├── services/
│       │   ├── smtp_service.py        # SMTP sending
│       │   └── embedding.py          # Vector embedding service (P1)
│       ├── models/                    # SQLAlchemy ORM
│       │   ├── user.py
│       │   ├── note.py               # Notes table + tags + reactions
│       │   └── email_account.py
│       ├── schemas/                   # Pydantic models
│       │   └── memo.py               # Note request/response
│       ├── imap/                      # IMAP protocol layer
│       │   ├── connection.py         # Connection pool
│       │   ├── message.py            # Message parsing / search
│       │   └── types.py              # Pydantic email models
│       ├── database.py               # Database engine & migrations
│       └── main.py                   # App entry point
├── frontend/                          # React SPA
│   └── src/
│       ├── features/
│       │   ├── mail/                 # Email (three-panel layout)
│       │   ├── memos/                # Notes (timeline + editor)
│       │   ├── compose/              # Compose (rich text editor)
│       │   ├── settings/             # Settings panels
│       │   └── contacts/             # Address book
│       ├── stores/                   # Zustand state management
│       │   ├── mail.ts
│       │   ├── memos.ts              # Notes state
│       │   └── auth.ts
│       ├── api/                      # API client
│       │   ├── mail.ts
│       │   ├── memos.ts              # Notes API
│       │   └── contacts.ts
│       └── App.tsx                   # Routes + unified layout
├── docker/
├── docs/
│   └── agent-notes.md               # Agent notes guide (P1)
├── NOTE_DEVELOPMENT_PLAN.md          # Notes development plan
└── DEVELOPMENT_ROADMAP.md            # Development roadmap
```

---

## 🗺️ Planning

Detailed development plans:
- 📄 [`NOTE_DEVELOPMENT_PLAN.md`](NOTE_DEVELOPMENT_PLAN.md) — Notes module development plan (6 phases, ~19h)
- 📄 [`DEVELOPMENT_ROADMAP.md`](DEVELOPMENT_ROADMAP.md) — Full development roadmap

---

## 🤝 Contributing

Issues and PRs are welcome. Please read the development plan documents before contributing.

---

## 📄 License

[MIT](LICENSE)

## References

- [Roundcube Webmail](https://github.com/roundcube/roundcubemail) — Email architecture reference
- [Memos](https://github.com/usememos/memos) — Notes architecture reference ([AGENTS.md](https://github.com/usememos/memos/blob/main/AGENTS.md) code map + API design)
- [Google AIP](https://google.aip.dev/) — API design guidelines (adopted by Memos/Note API)
