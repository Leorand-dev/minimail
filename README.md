# Webmail — 智能邮件系统

基于 [Roundcube Webmail](https://github.com/roundcube/roundcubemail) 架构分析构建的新一代邮件系统，融合 **AI Agent 自动化操作**能力。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

---

## 简介

Webmail 是一个具备完整邮件能力的 Web 邮件客户端，支持 IMAP 收件、SMTP 发件、通讯录管理、API 授权管理等功能。所有功能在单一页面内完成，左侧功能导航、右侧内容区动态切换。

---

## 功能

| 功能 | 说明 |
|------|------|
| 📥 **收件箱** | IMAP 三栏布局、文件夹树、邮件列表、预览面板、搜索、分页 |
| ✏️ **写邮件** | 富文本编辑、收件人自动完成 (通讯录联动)、附件 |
| ⚙️ **设置** | IMAP / SMTP 配置、密码加密存储、连接测试 |
| 👤 **通讯录** | 联系人 CRUD、分组管理、搜索、自动完成 |
| 🔑 **API 密钥** | 令牌创建/撤销/过期管理、一次性展示、范围控制 |
| 🚪 **登录/注册** | JWT 双令牌、自动续期、持久登录 |

---

## 快速开始

### 前置条件

- Python 3.11+
- Node.js 20+
- Docker (PostgreSQL + Redis)
- IMAP / SMTP 邮箱账号

```bash
# 克隆
git clone https://github.com/Leorand-dev/webmail.git
cd webmail

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

访问 **http://localhost:5173** → 注册账号 → 在设置中配置 IMAP/SMTP 后即可收发邮件。

---

## 本地开发

```bash
make dev           # 一键启动前后端 + 数据库
make dev-backend   # 仅后端
make dev-frontend  # 仅前端
make migrate       # 数据库迁移
```

---

## 技术栈

| 层 | 选型 |
|------|------|
| 后端框架 | FastAPI (Python 3.11+, async) |
| ORM | SQLAlchemy 2.0 (async) + Alembic |
| 数据库 | PostgreSQL 16 |
| 缓存 | Redis 7 (可选) |
| API 认证 | JWT (双令牌: access + refresh) |
| 前端 | React 19 + TypeScript 5 + Vite 6 |
| 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand |
| 邮件协议 | aioimaplib (IMAP), aiosmtplib (SMTP) |
| 密码加密 | Fernet (symmetric) |
| 部署 | Docker Compose |

---

## 项目结构

```
webmail/
├── backend/                    # FastAPI 异步后端
│   └── app/
│       ├── api/                # REST 路由 (auth/settings/mail/contacts/tokens)
│       ├── services/           # 业务逻辑 (IMAP/SMTP/联系人/令牌)
│       ├── models/             # SQLAlchemy ORM 模型
│       ├── schemas/            # Pydantic 通信模型
│       ├── imap/               # IMAP 协议层 (连接池/解析/搜索)
│       ├── database.py         # 数据库引擎 & 自动建表
│       └── main.py             # 应用入口
├── frontend/                   # React SPA
│   └── src/
│       ├── features/           # 功能模块 (mail/compose/settings/contacts/api-keys/auth)
│       ├── stores/             # Zustand 状态管理
│       ├── api/                # API 客户端 (含自动刷新 token)
│       ├── components/         # 通用组件
│       └── App.tsx             # 路由配置
├── docker/                     # Docker Compose
├── docs/                       # 文档
├── DEVELOPMENT_PLAN.md         # 完整开发计划
└── DEVELOPMENT_ROADMAP.md      # 开发路线图
```

---

## 许可证

[MIT](LICENSE)

## 参考

- [Roundcube Webmail](https://github.com/roundcube/roundcubemail) — 架构来源
