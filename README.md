# Minimail — AI Agent 驱动的邮件与知识管理平台

> 融合 **邮件** · **笔记库** · **知识库** 为一体，通过统一的 **Agent API** 让 AI 智能体自主操作一切。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

> 🌐 **[English README](README_EN.md)**

---

## 📌 概述

Minimail 是一个**面向 AI Agent 时代**的全栈平台，以邮件为核心，逐步扩展为个人知识管理中枢：

- **📧 邮件系统** — 全功能 IMAP/SMTP 邮件客户端（类 Roundcube）
- **📝 笔记库 (Note)** — Markdown 原生笔记，支持标签/搜索/置顶/归档
- **🧠 知识储备** — 笔记内容向量化，Agent 可语义检索作为上下文
- **🤖 Agent API** — 统一的 REST API，AI Agent 通过 API 密钥自主操作全部功能

Agent（Hermes / Claude Code / OpenAI Codex 等）是 Minimail 的**一等公民**——不仅用户能使用，Agent 也能通过 API 读写邮件、记录笔记、检索知识。

---

## 🔥 AI Agent 集成

Minimail 所有功能均通过 REST API 暴露，**统一受 API 密钥保护**。Agent 持密钥即可自主完成日常工作。

### Agent 能力全景

| 领域 | 能力 | API 端点 |
|------|------|----------|
| 📥 **邮件** | 读取/搜索/发送/删除/移动 | `GET/POST /api/mail/*` |
| 📝 **笔记** | 创建/查询/搜索/更新/归档 | `GET/POST/PUT/DELETE /api/notes/*` |
| 🔍 **知识检索** | 全文搜索 + 语义向量搜索 | `GET /api/notes/search`, `POST /api/notes/search/semantic` |
| 👤 **通讯录** | 联系人 CRUD | `GET/POST/PUT/DELETE /api/contacts/*` |
| 🔑 **自身管理** | API 密钥创建/撤销 | `POST/DELETE /api/auth/tokens` |

### Agent 工作流示例

```bash
# 1. Agent 登录并获取令牌
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -d '{"email":"agent@example.com","password":"***"}' \
  -H "Content-Type: application/json" | jq -r '.access_token')

# 2. Agent 查询收件箱
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/mail/messages?folder=INBOX

# 3. Agent 记录决策到笔记库
curl -s -X POST http://localhost:8000/api/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# 架构决策记录\n\n## 2026-07-06 数据库选型\n\n决定使用 PostgreSQL 16，原因：...",
    "tags": ["adr", "database"]
  }'

# 4. Agent 语义搜索笔记库
curl -s -X POST http://localhost:8000/api/notes/search/semantic \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "如何配置 IMAP 连接", "top_k": 3}'
```

### 认证方式

```
Authorization: Bearer <api-token>    # Agent 持有令牌
X-API-Key: wm_xxx                    # 或 API 密钥头
```

Agent 持有令牌后拥有与 Web 用户**相同的权限模型**，无需额外配置。

---

## ✨ 功能

### 📧 邮件系统

| 功能 | 说明 |
|------|------|
| **三栏布局** | 文件夹树 → 邮件列表 → 预览面板，多邮箱账户统一收件箱 |
| **IMAP 支持** | 连接池、SSL/TLS、多账户并行连接、文件夹订阅、增删文件夹 |
| **SMTP 发送** | 富文本编辑器 (TipTap)、HTML 邮件、附件、回复/转发/全部回复 |
| **搜索增强** | 关键词高亮、日期范围筛选、仅未读筛选 |
| **附件管理** | 预览面板附件点击下载、拖拽上传 | 📋 |
| **回复/转发** | 一键回复/全部回复/转发，自动预填收件人+引用原文 |
| **会话模式** | 邮件按主题分组，折叠展开 | 📋 |
| **邮箱设置向导** | 自动检测 IMAP/SMTP 设置 | 📋 |
| **多账户** | 多邮箱管理、独立 IMAP/SMTP 配置、统一收件箱聚合 |
| **通讯录** | 联系人 CRUD、分组管理、搜索防抖、写邮件自动完成 |
| **IMAP 状态** | 实时连接状态、最后同步时间、手动刷新 |
| **通知** | WebSocket / SSE 实时新邮件提醒 | 📋 |
| **全文搜索** | PostgreSQL tsvector 或 pgvector 语义搜索 | 📋 |

### 📝 笔记库 (Note) — 基于 [Memos](https://github.com/usememos/memos) 架构解构自实现

| 功能 | 说明 |
|------|------|
| **Markdown 编辑** | TipTap WYSIWYG + Markdown 源码双模式 |
| **时间线** | 按创建时间倒序，卡片式列表 |
| **标签系统** | `#tag` 自动提取，侧栏过滤 |
| **置顶/归档** | 重要笔记置顶，归档笔记可恢复 |
| **可见性** | Private / Public 两级控制 |
| **AI 语义检索** | 笔记向量化，Agent 可语义搜索 |
| **评论/线程** | 在笔记下嵌套评论 | 📋 |
| **附件上传** | 拖拽图片/文件到笔记 | 📋 |
| **反应 (Reaction)** | Emoji 反应 | 📋 |
| **@提及** | 编辑器内 `@联系人`，联动通讯录 | 📋 |
| **快捷入口** | 保存过滤条件为侧栏快捷入口 | 📋 |
| **RSS Feed** | 公开笔记的 RSS 订阅 | 📋 |

### 🔗 知识库 (Knowledge Base)

| 功能 | 说明 |
|------|------|
| **全文检索** | PostgreSQL tsvector 中文分词全文索引 |
| **语义搜索** | pgvector 向量索引 + 嵌入模型 (P1) |
| **Agent 上下文** | Agent 在对话中自动检索笔记库作为参考 |
| **邮件 → 笔记** | 一键将邮件转为笔记归档 (P2) |

### 🛡️ Agent API

| 功能 | 说明 |
|------|------|
| **统一认证** | JWT + API 密钥双通道 |
| **全功能暴露** | 邮件/笔记/通讯录/设置全部可 API 操作 |
| **范围控制** | API 密钥可限定权限范围 |
| **Webhook** | 事件通知 (邮件到达/笔记更新时触发) | 📋 |
| **MCP 协议** | Model Context Protocol 原生支持 | 📋 |

---

## 🚀 快速开始

```bash
# 克隆
git clone https://github.com/Leorand-dev/minimail.git
cd minimail

# 启动数据库
docker compose -f docker/docker-compose.yml up -d postgres redis

# 后端
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 前端
cd ../frontend
npm install
npx vite --host 0.0.0.0 --port 5173
```

访问 **http://localhost:5173** → 注册账号 → 开始使用。

---

## 🧰 技术栈

| 层 | 选型 |
|------|------|
| 后端框架 | **FastAPI** (Python 3.11+, async) |
| ORM | **SQLAlchemy 2.0** (async) + Alembic |
| 数据库 | **PostgreSQL 16** + pgvector (语义搜索) |
| 向量搜索 | **pgvector** (`ivfflat` 索引) (P1) |
| 嵌入模型 | LLM 推理端点 (可配置) |
| 缓存 | Redis 7 (可选) |
| 前端 | **React 19** + **TypeScript 5** + **Vite 6** |
| 样式 | **Tailwind CSS 4** |
| 状态管理 | **Zustand** |
| 邮件协议 | aioimaplib (IMAP), aiosmtplib (SMTP) |
| 密码加密 | Fernet (对称加密) |
| 认证 | JWT (双令牌: access + refresh) + API Key |
| 部署 | Docker Compose |

---

## 📂 项目结构

```
minimail/
├── backend/                           # FastAPI 异步后端
│   └── app/
│       ├── api/                       # REST 路由
│       │   ├── auth.py               # 认证
│       │   ├── mail.py               # 邮件 (IMAP/SMTP)
│       │   ├── memos.py              # 笔记库 CRUD + 搜索
│       │   ├── contacts.py           # 通讯录
│       │   ├── email_accounts.py     # 邮箱账户管理
│       │   ├── api_tokens.py         # API 密钥
│       │   └── settings.py           # 系统设置
│       ├── services/
│       │   ├── smtp_service.py        # SMTP 发送
│       │   └── embedding.py          # 向量嵌入服务 (P1)
│       ├── models/                    # SQLAlchemy ORM
│       │   ├── user.py
│       │   ├── note.py               # 笔记表 + 标签 + 反应
│       │   └── email_account.py
│       ├── schemas/                   # Pydantic 通信模型
│       │   └── memo.py               # 笔记请求/响应
│       ├── imap/                      # IMAP 协议层
│       │   ├── connection.py         # 连接池
│       │   ├── message.py            # 邮件解析/搜索
│       │   └── types.py              # Pydantic 邮件模型
│       ├── database.py               # 数据库引擎 & 迁移
│       └── main.py                   # 应用入口
├── frontend/                          # React SPA
│   └── src/
│       ├── features/
│       │   ├── mail/                 # 邮件 (三栏布局)
│       │   ├── memos/                # 笔记库 (时间线 + 编辑器)
│       │   ├── compose/              # 写邮件 (富文本编辑器)
│       │   ├── settings/             # 设置面板
│       │   └── contacts/             # 通讯录
│       ├── stores/                   # Zustand 状态管理
│       │   ├── mail.ts
│       │   ├── memos.ts              # 笔记库状态
│       │   └── auth.ts
│       ├── api/                      # API 客户端
│       │   ├── mail.ts
│       │   ├── memos.ts              # 笔记 API
│       │   └── contacts.ts
│       └── App.tsx                   # 路由 + 统一布局
├── docker/
├── docs/
│   └── agent-notes.md               # Agent 笔记操作指南 (P1)
├── NOTE_DEVELOPMENT_PLAN.md          # 笔记库完整开发方案
└── DEVELOPMENT_ROADMAP.md            # 开发路线图
```

---

## 🗺️ 规划

详细开发计划见：
- 📄 [`NOTE_DEVELOPMENT_PLAN.md`](NOTE_DEVELOPMENT_PLAN.md) — 笔记库完整开发方案 (6 Phase, ~19h)
- 📄 [`DEVELOPMENT_ROADMAP.md`](DEVELOPMENT_ROADMAP.md) — 完整开发路线图

---

## 🤝 贡献

欢迎提交 Issue 和 PR。开发前请阅读开发计划文档。

---

## 📄 许可证

[MIT](LICENSE)

## 参考

- [Roundcube Webmail](https://github.com/roundcube/roundcubemail) — 邮件架构参考
- [Memos](https://github.com/usememos/memos) — 笔记库架构参考 ([AGENTS.md](https://github.com/usememos/memos/blob/main/AGENTS.md) 代码映射 + API 设计)
- [Google AIP](https://google.aip.dev/) — API 设计规范 (被 Memos/Note API 采纳)
