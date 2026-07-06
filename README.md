# Webmail — 智能邮件系统

基于 [Roundcube Webmail](https://github.com/roundcube/roundcubemail) 架构分析构建的新一代邮件系统，融合 **AI Agent 自动化操作**能力。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-18-61dafb)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

---

## 特性

### 邮件核心
- **多协议支持** — IMAP 收件 + SMTP 发件，兼容 Gmail、Outlook、QQ 邮箱、自建 Dovecot
- **MIME 完整解析** — HTML/纯文本/附件/内嵌图片，多种编码格式
- **全功能操作** — 文件夹管理、邮件标记、批量操作、会话线程、拖拽排序
- **高性能** — Redis 缓存 + 虚拟列表，10 万+ 邮箱流畅浏览

### AI Agent 集成
- **MCP 协议** — 标准 Model Context Protocol，任何 MCP 兼容 Agent 可直接操作邮件
- **OpenAI Function Calling** — 与 GPT-4 / Claude / DeepSeek 等无缝对接
- **语义搜索** — pgvector 向量化搜索，自然语言查找邮件（"上个月预算审批的邮件"）
- **事件驱动** — IMAP IDLE → 事件总线 → Webhook / SSE，Agent 实时响应
- **自动工作流** — 紧急回复、每日摘要、行程提取、垃圾学习等预置场景
- **对话式操作** — 与 AI 对话完成所有邮件操作，无需手动点击

### 系统能力
- **插件系统** — Hook 事件机制，可扩展 30+ 插件
- **国际化** — 70+ 语言，RTL 支持
- **安全** — PGP 加密、XSS 过滤、图片代理、Agent 审计日志、细粒度权限
- **Docker 一键部署** — FastAPI + React SPA + PostgreSQL + Redis

---

## 架构概览

```
                    ┌─────────────────────┐
                    │   React SPA (前端)   │
                    │  Mail / Compose /    │
                    │  Contacts / Chat     │
                    └──────────┬──────────┘
                               │ REST API
                    ┌──────────▼──────────┐
                    │  FastAPI Backend     │
                    │  ┌─────────────────┐ │
                    │  │   Agent Gateway  │ │  ← MCP / OpenAI Tool
                    │  │  Webhook / SSE   │ │  ← 事件驱动
                    │  └─────────────────┘ │
                    │  ┌─────────────────┐ │
                    │  │   IMAP / SMTP   │ │  ← 邮件协议
                    │  │   MIME 解析     │ │
                    │  │   插件引擎      │ │
                    │  └─────────────────┘ │
                    │  ┌─────────────────┐ │
                    │  │  AI 服务        │ │  ← 分类/总结/语义搜索
                    │  └─────────────────┘ │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ▼                    ▼                    ▼
    ┌──────────┐       ┌──────────┐        ┌────────────┐
    │PostgreSQL│       │  Redis   │        │  IMAP 服务器 │
    │+pgvector │       │缓存/会话 │        │ (Gmail/自建) │
    └──────────┘       └──────────┘        └────────────┘
```

---

## 快速开始

```bash
# 克隆
git clone https://github.com/Leorand-dev/webmail.git
cd webmail

# 启动开发环境
docker compose -f docker/docker-compose.yml up -d

# 访问
open http://localhost:3000
```

> 详细部署指南见 [docs/INSTALL.md](docs/INSTALL.md)

---

## 项目结构

```
webmail/
├── backend/                    # FastAPI 后端
│   └── app/
│       ├── api/                # 路由层
│       ├── services/           # 业务逻辑
│       ├── agent/              # AI Agent 集成
│       ├── models/             # 数据模型
│       └── plugins/            # 插件系统
├── frontend/                   # React 前端
│   └── src/
│       ├── features/           # 功能模块
│       └── components/         # 公共组件
├── docker/                     # Docker Compose
├── docs/                       # 文档
└── DEVELOPMENT_PLAN.md         # 完整开发计划
```

---

## 开发路线

| 阶段 | 周期 | 产出 |
|------|------|------|
| Phase 0 | Week 1 | 项目基建 / Docker / CI |
| Phase 1-3 | Week 2-5 | 核心邮件功能 (认证/IMAP/浏览/发送) |
| Phase 4-5 | Week 6-7 | 通讯录 / 设置 / 国际化 |
| Phase 6-7 | Week 8-11 | 高级功能 / 插件系统 |
| Phase 8 | Week 12 | 部署 / 运维就绪 |
| Phase 9 | Week 13-16 | **AI Agent 集成** |

完整开发计划见 [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md)

---

## 技术栈

| 层 | 选型 |
|------|------|
| 后端框架 | FastAPI (Python 3.11+) |
| ORM | SQLAlchemy 2.0 + Alembic |
| 数据库 | PostgreSQL 16 + pgvector |
| 缓存 | Redis 7 |
| 前端 | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS 4 |
| IMAP | aiosmtplib + imaplib (async) |
| SMTP | aiosmtplib |
| Agent 协议 | MCP + OpenAI Function Calling |
| 部署 | Docker Compose |

---

## 许可证

[MIT](LICENSE)

## 参考

- [Roundcube Webmail](https://github.com/roundcube/roundcubemail) — 架构来源
