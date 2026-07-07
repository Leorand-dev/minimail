# Minimail — AI Agent-Driven Email & Knowledge Management Platform

> Integrates **Email** · **Notes Library** · **Knowledge Base** into one unified platform with a single **Agent API** for AI agents to operate everything autonomously.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

> 🌐 **[中文版 README](README.md)**

---

## 📌 Overview

Minimail is a full-stack platform built for the **AI Agent era**, centered around email and expanding into a personal knowledge management hub:

- **📧 Email System** — Full-featured IMAP/SMTP webmail client (Roundcube-inspired)
- **📝 Notes Library (Note)** — Markdown-native note-taking with tags, search, pinning, archiving, reactions, comments, and attachments
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
curl -s -H "Authorization: Bearer ***" \
  http://localhost:8000/api/mail/messages?folder=INBOX

# 3. Agent records a decision in the notes library
curl -s -X POST http://localhost:8000/api/notes \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Architecture Decision Record\n\n## 2026-07-06 Database Selection\n\nChose PostgreSQL 16 because...",
    "tags": ["adr", "database"]
  }'

# 4. Agent performs a semantic search across notes
curl -s -X POST http://localhost:8000/api/notes/search/semantic \
  -H "Authorization: Bearer ***" \
  -H "Content-Type: application/json" \
  -d '{"query": "How to configure IMAP connection", "top_k": 3}'
```

### Authentication

```
Authorization: Bearer ***    # Agent bearer token
X-API-Key: ***                    # Or API key header
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
| **Search Enhanced** | Keyword highlighting, date range filter, unread-only filter |
| **Attachment Management** | Click-to-download from preview pane, drag-and-drop upload |
| **Reply/Forward** | One-click reply / reply-all / forward with auto-filled recipients and quoted text |
| **Conversation View** | Threaded messages grouped by subject, collapsible conversation tree |
| **Account Setup Wizard** | Auto-detect IMAP/SMTP settings — 20+ preset providers (Gmail, QQ, 163, Outlook, iCloud, Yahoo, Alibaba Cloud etc.) + MX record matching + fallback guessing |
| **Multi-Account** | Multiple email accounts, independent IMAP/SMTP config, unified inbox aggregation |
| **Multi-Account Sender** | Sender dropdown in compose page, auto-loads account list, sends with account_id |
| **Contacts** | Contact CRUD, group management, debounced search, compose autocomplete |
| **IMAP Status** | Live connection status, last sync time, manual refresh |
| **Notifications** | WebSocket / SSE real-time new-email alerts |
| **Full-Text Search** | PostgreSQL tsvector or pgvector semantic search |
| **Email → Note** | One-click conversion of emails to notes with auto-formatted Markdown + `email` tag |

### 📝 Notes Library — Architecture derived from [Memos](https://github.com/usememos/memos)

| Feature | Description |
|---------|-------------|
| **Markdown Editor** | TipTap WYSIWYG + Markdown source dual mode |
| **Timeline** | Reverse chronological card-style list |
| **Tag System** | `#tag` auto-extraction, sidebar filter |
| **Pin/Archive** | Pin important notes, archived notes recoverable (soft-delete) |
| **Visibility** | Private / PROTECTED / Public three-level control |
| **AI Semantic Search** | Note vectorization, agent-searchable via cosine similarity |
| **Reactions** | Toggle-style emoji reactions (👍❤️🎉), optimistic UI updates |
| **Comments / Threads** | Nested comments under notes via parent_id |
| **Attachments** | Drag-and-drop images / files into notes, dedicated NoteAttachment model |
| **@Mentions** | `@contact` autocomplete in editor, linked to address book |
| **Shortcuts** | Save filter conditions as sidebar shortcuts |
| **Public Share Links** | Generate share tokens, unauthenticated access, global toggle in settings |
| **Link Metadata** | Automatic OG metadata fetching (BeautifulSoup4) via `/notes/link-metadata` |
| **Content Properties** | Runtime-computed has_link / has_code / has_task_list / title fields in responses |
| **SSE Real-Time Sync** | sse-starlette EventSource for instant note change push |
| **RSS Feed** | Public note RSS subscription |

### 🔗 Knowledge Base

| Feature | Description |
|---------|-------------|
| **Full-Text Search** | PostgreSQL tsvector with Chinese word segmentation (GIN index) |
| **Semantic Search** | pgvector ivfflat index + embedding model for cosine similarity |
| **Agent Context** | Agents auto-retrieve notes as reference during conversations |
| **Unified Search** | `GET /api/search` crosses notes + mail.messages via tsquery |

### 🛡️ Agent API

| Feature | Description |
|---------|-------------|
| **Unified Auth** | JWT (dual token: access + refresh) + API key dual channel |
| **Full Feature Exposure** | Email / notes / contacts / settings all API-accessible |
| **Scope Control** | API keys can be restricted by permission scope (read / read,write / admin) |
| **Expiration** | API keys with configurable expiration time |
| **Webhook** | Event notifications (note.created / updated / deleted) with HMAC-SHA256 signing |
| **MCP Protocol** | Native Model Context Protocol support |

### ⚡ System Optimizations

| Optimization | Description |
|--------------|-------------|
| **Frontend Chunk Splitting** | Vendor (96 kB) + editor (412 kB) + app (430 kB), chunk warnings eliminated |
| **Unified Error Handling** | Global Exception handler — HTTPException passthrough, ValidationError 422, 500 with logging |
| **API Documentation** | 25+ notes endpoints, ~70 total endpoints across system API docs |
| **System Documentation** | 7 operations guides + 7 API reference docs + entry index, rendered as DocsPage |
| **Sidebar Refactor** | Notes library extracted as independent collapsible section |
| **Git History Sanitized** | filter-branch cleaned 30 commits, force-pushed |

### 📚 System Docs

- **Operations guides**: deployment, email, notes, contacts, agent, settings, quickstart
- **API reference**: mail, notes, contacts, auth, tokens, settings, index
- **DocsPage viewer**: left nav tree + right HTML rendering

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

> 📖 Detailed deployment guide (production, Docker, Nginx, SSL): **[🚀 Deployment Guide](docs/system/operations/deployment.md)**

---

## 🧰 Tech Stack

| Layer | Choice |
|-------|--------|
| Backend Framework | **FastAPI** (Python 3.11+, async) |
| ORM | **SQLAlchemy 2.0** (async) + Alembic |
| Database | **PostgreSQL 16** + pgvector (semantic search) |
| Vector Search | **pgvector** (`ivfflat` index) |
| Embedding Model | LLM inference endpoint (configurable) |
| Cache | Redis 7 (optional) |
| SSE | **sse-starlette** (real-time event push) |
| Link Metadata | **BeautifulSoup4** (OG tag parsing) |
| DNS MX Lookup | **dnspython** (email auto-detect) |
| Frontend | **React 19** + **TypeScript 5** + **Vite 6** |
| Styling | **Tailwind CSS 4** |
| State Management | **Zustand** |
| Rich Text Editor | **TipTap** (WYSIWYG + Markdown) |
| Email Protocols | aioimaplib (IMAP), aiosmtplib (SMTP) |
| Password Encryption | Fernet (symmetric) |
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
│       │   ├── settings.py           # System settings
│       │   ├── auto_detect.py        # Email setup wizard (MX/IMAP auto-detect)
│       │   ├── shares.py             # Public share links
│       │   ├── system_docs.py        # System documentation serving
│       │   ├── search.py             # Unified search (notes + mail)
│       │   ├── files.py              # File upload/download
│       │   └── health.py             # Health check endpoint
│       ├── services/
│       │   ├── smtp_service.py       # SMTP sending
│       │   ├── embedding.py          # Vector embedding service
│       │   ├── auth.py               # Auth logic
│       │   ├── contact.py            # Contact business logic
│       │   ├── email_account.py      # Account management logic
│       │   ├── api_token.py          # API token logic
│       │   └── redis_service.py      # Redis pub/sub for SSE
│       ├── models/                   # SQLAlchemy ORM
│       │   ├── user.py
│       │   ├── note.py               # Notes table + tags + reactions
│       │   ├── email_account.py
│       │   ├── api_token.py
│       │   └── contact.py
│       ├── schemas/                  # Pydantic communication models
│       │   ├── memo.py               # Note request/response
│       │   ├── note.py               # Note note schemas
│       │   ├── auth.py               # Auth request/response
│       │   ├── contact.py
│       │   ├── email_account.py
│       │   └── api_token.py
│       ├── imap/                     # IMAP protocol layer
│       │   ├── connection.py         # Connection pool
│       │   ├── message.py            # Message parsing / search
│       │   ├── types.py              # Pydantic email models
│       │   ├── folder.py             # Folder management
│       │   ├── parser.py             # MIME / header parsing
│       │   └── demo_data.py          # Demo data for conversation view
│       ├── agent/                    # AI Agent integration
│       │   └── tools/                # Agent tool definitions
│       ├── plugins/                  # Plugin system
│       ├── utils/                    # Shared utilities
│       ├── config.py                 # Application config
│       ├── database.py               # Database engine & migrations
│       └── main.py                   # App entry point
├── frontend/                         # React SPA
│   └── src/
│       ├── features/
│       │   ├── mail/                 # Email (three-panel layout)
│       │   │   ├── MailLayout.tsx
│       │   │   ├── ConversationList.tsx   # Threaded conversation view
│       │   │   ├── MessageList.tsx
│       │   │   ├── MessageRow.tsx
│       │   │   ├── PreviewPane.tsx
│       │   │   ├── FolderSidebar.tsx
│       │   │   ├── Toolbar.tsx
│       │   │   └── AttachmentManager.tsx
│       │   ├── memos/                # Notes library (timeline + editor)
│       │   │   ├── MemosPage.tsx
│       │   │   ├── MemoList.tsx
│       │   │   ├── MemoCard.tsx
│       │   │   ├── MemoEditor.tsx
│       │   │   └── TagsManager.tsx
│       │   ├── compose/              # Compose (rich text editor)
│       │   │   ├── ComposePage.tsx
│       │   │   ├── ComposePanel.tsx
│       │   │   ├── RichTextEditor.tsx
│       │   │   └── AutocompleteInput.tsx
│       │   ├── settings/             # Settings panels
│       │   │   ├── SettingsPage.tsx
│       │   │   └── SettingsPanel.tsx
│       │   ├── contacts/             # Address book
│       │   │   ├── ContactsPage.tsx
│       │   │   └── ContactsPanel.tsx
│       │   ├── auth/                 # Authentication
│       │   │   ├── LoginPage.tsx
│       │   │   ├── RegisterPage.tsx
│       │   │   └── SetupPage.tsx     # First-run admin setup
│       │   ├── user/                 # User management
│       │   │   ├── ProfilePanel.tsx  # Display name / password change
│       │   │   └── UserMenu.tsx      # Header dropdown menu
│       │   ├── api-keys/             # API key management
│       │   │   └── ApiKeysPanel.tsx
│       │   ├── docs/                 # System documentation viewer
│       │   │   └── DocsPage.tsx
│       │   └── search/               # Unified search
│       │       └── SearchPanel.tsx
│       ├── stores/                   # Zustand state management
│       │   ├── mail.ts
│       │   ├── memos.ts              # Notes state
│       │   └── auth.ts
│       ├── api/                      # API client
│       │   ├── client.ts             # Axios client with interceptors
│       │   ├── mail.ts
│       │   ├── memos.ts              # Notes API
│       │   ├── contacts.ts
│       │   ├── accounts.ts           # Email accounts API
│       │   ├── auth.ts
│       │   ├── api_tokens.ts
│       │   ├── search.ts
│       │   ├── settings.ts
│       │   └── user.ts               # User profile API
│       ├── App.tsx                   # Routes + unified layout
│       └── main.tsx                  # Vite entry point
├── docker/
│   └── docker-compose.yml
├── docs/
│   ├── system/
│   │   ├── index.md                 # System docs entry
│   │   ├── api/                     # API reference (7 docs)
│   │   │   ├── index.md
│   │   │   ├── mail.md
│   │   │   ├── notes.md             # 25+ endpoints
│   │   │   ├── contacts.md
│   │   │   ├── auth.md
│   │   │   ├── tokens.md
│   │   │   └── settings.md
│   │   └── operations/              # Operations guides (7 docs)
│   │       ├── index.md
│   │       ├── deployment.md
│   │       ├── email.md
│   │       ├── notes.md
│   │       ├── contacts.md
│   │       ├── agent.md
│   │       ├── settings.md
│   │       └── quickstart.md
│   ├── ARCHITECTURE.md
│   ├── DEVELOPMENT_PLAN.md
│   ├── INSTALL.md
│   ├── PROGRESS.md
│   └── agent-notes.md               # Agent notes guide
├── NOTE_DEVELOPMENT_PLAN.md          # Notes module development plan (6 phases, ~19h)
├── DEVELOPMENT_ROADMAP.md            # Development roadmap
└── CHANGELOG.md                      # Full changelog
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
