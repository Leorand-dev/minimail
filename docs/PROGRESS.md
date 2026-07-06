# Phase 0 开发进度记录

## ✅ 已完成

### Chunk 1: 后端骨架 ✅
- [x] `backend/app/config.py` — Pydantic Settings (数据库/Redis/JWT/CORS/LLM/上传)
- [x] `backend/app/database.py` — SQLAlchemy 2.0 async engine + session + Base
- [x] `backend/app/main.py` — FastAPI 入口 (lifespan: init_db + close_db, CORS, 路由挂载)
- [x] `backend/app/__init__.py` + 所有子包 `__init__.py`
- [x] `backend/app/api/health.py` — 3 个健康检查路由 (/health, /health/db, /health/redis)
- [x] `backend/requirements.txt` — 依赖固定 + bcrypt 兼容性修复
- [x] `backend/.env.example` + `.env` — 环境变量模板
- [x] 后端模块导入验证通过

### Chunk 2: 用户认证 ✅
- [x] `backend/app/models/user.py` — User ORM (含 IMAP/SMTP 配置 + 偏好 + 配额)
- [x] `backend/app/schemas/auth.py` — Pydantic 请求/响应 + 密码强度校验
- [x] `backend/app/services/auth.py` — AuthService (hash/verify, JWT encode/decode, register/login/refresh)
- [x] `backend/app/api/auth.py` — 4 个路由 (POST /register, /login, /refresh, GET /me)
- [x] JWT access_token(15min) + refresh_token(7d) + auto-refresh 机制
- [x] 依赖注入: `get_current_user`
- [x] bcrypt 兼容性修复 (pinned bcrypt<4.1)
- [x] 模块导入验证通过

### Chunk 3: Redis + Alembic ✅
- [x] `backend/app/services/redis_service.py` — Redis 异步连接池 + JSON 存取 + 健康检查
- [x] `migrations/env.py` — Alembic async 环境配置
- [x] `migrations/versions/001_create_users_table.py` — 初始迁移 (users 表全字段)
- [x] `alembic.ini` — 迁移配置

### Chunk 4: 前端基建 ✅
- [x] `package.json` — React 19 + React Router 7 + Zustand 5 + Axios + Tailwind 4
- [x] `vite.config.ts` — 代理 /api → :8000, 路径别名 @/
- [x] `tsconfig.json` — Strict mode, 路径映射
- [x] `src/index.css` — Tailwind 4 + Roundcube 主题色 (#066da5)
- [x] `src/main.tsx` — 入口
- [x] `src/App.tsx` — 路由 (/login, /register, /mail protected)
- [x] `src/stores/auth.ts` — Zustand auth store (persist to localStorage)
- [x] `src/api/client.ts` — Axios 实例 + JWT 拦截器 + token 刷新队列
- [x] `src/api/auth.ts` — register/login/refresh/me API 调用
- [x] `src/features/auth/LoginPage.tsx` — 登录页 (Roundcube 居中卡片风格)
- [x] `src/features/auth/RegisterPage.tsx` — 注册页
- [x] `public/favicon.svg` — Webmail Logo

### Chunk 5: Docker + CI + 文档 ✅
- [x] `docker/docker-compose.yml` — 4 服务 (postgres+pgvector, redis, backend, frontend)
- [x] `.github/workflows/ci.yml` — 4 个 job (backend-lint, backend-test, frontend-lint, frontend-build)
- [x] `Makefile` — dev/dev-backend/dev-frontend/dev-db/build/test/lint/migrate/clean
- [x] `docs/INSTALL.md` — 从零部署指南 (Docker + 本地双方式)

## 📊 验证结果

| 检查项 | 状态 |
|--------|------|
| 后端语法检查 | ✅ |
| 后端模块导入 | ✅ |
| JWT 编解码 | ✅ |
| bcrypt 密码哈希 | ✅ |
| TypeScript 类型检查 | ✅ |
| Vite 构建 (102 modules) | ✅ |

## 🚀 下一步: Phase 1 — IMAP 邮件同步

- [ ] IMAP 协议层 (aioimaplib)
- [ ] 文件夹同步 (INBOX/Sent/Drafts/Trash/Spam)
- [ ] 邮件列表 API + MIME 解析
- [ ] 邮件预览渲染
- [ ] Frontend 三栏布局 (FolderSidebar + MessageList + PreviewPane)
- [ ] 搜索 API + 前端搜索栏
