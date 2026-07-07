# 🚀 部署指南

> 本文档涵盖 Minimail 的开发环境搭建和生产部署。

---

## 目录

1. [环境要求](#1-环境要求)
2. [快速开始 (开发环境)](#2-快速开始-开发环境)
3. [生产部署](#3-生产部署)
4. [环境变量](#4-环境变量)
5. [数据库](#5-数据库)
6. [构建前端](#6-构建前端)
7. [Nginx 反向代理](#7-nginx-反向代理)
8. [Docker 部署](#8-docker-部署)
9. [SSL 证书](#9-ssl-证书)
10. [备份与维护](#10-备份与维护)

---

## 1. 环境要求

| 依赖 | 版本要求 | 说明 |
|------|---------|------|
| Python | ≥ 3.11 | 后端运行环境 |
| Node.js | ≥ 18 | 前端构建 (推荐 ≥20) |
| PostgreSQL | ≥ 15 | 主数据库 (需 pgvector 扩展) |
| Redis | ≥ 7 | 缓存/会话 (可选) |
| uv | ≥ 0.5 | Python 包管理器 (推荐) |

### 可选依赖

| 依赖 | 说明 |
|------|------|
| Docker & Docker Compose | 容器化部署 |
| Nginx | 生产环境反向代理 |
| Certbot | SSL 证书自动续签 |

---

## 2. 快速开始 (开发环境)

### 2.1 克隆仓库

```bash
git clone https://github.com/Leorand-dev/minimail.git
cd minimail
```

### 2.2 配置环境变量

```bash
cp backend/.env.example backend/.env
# 按需修改 .env 中的配置
```

关键配置项（详见[环境变量](#4-环境变量)）：

```ini
# 后端 .env
DATABASE_URL=postgresql+asyncpg://webmail:密码@localhost:5432/webmail
SECRET_KEY=生成一个随机密钥
ENCRYPTION_KEY=生成一个 32 字符密钥
```

### 2.3 启动 PostgreSQL

```bash
# 如果本地没有 PostgreSQL，通过 Docker 启动：
docker run -d \
  --name minimail-postgres \
  -e POSTGRES_USER=webmail \
  -e POSTGRES_PASSWORD=webmail_dev \
  -e POSTGRES_DB=webmail \
  -p 5432:5432 \
  pgvector/pgvector:pg17
```

> **注意**: Django 使用 `pgvector/pgvector` 镜像以获得原生 pgvector 支持。
> 如果使用标准 PostgreSQL，需手动执行 `CREATE EXTENSION vector;`。

### 2.4 安装后端依赖 & 运行迁移

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
alembic upgrade head
```

### 2.5 启动后端

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

后端运行在 `http://localhost:8000`，API 文档在 `http://localhost:8000/docs`。

### 2.6 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 `http://localhost:5173`，通过 Vite proxy 转发 `/api` 请求到后端。

---

## 3. 生产部署

### 3.1 构建前端

```bash
cd frontend
npm install
npm run build
```

产物输出到 `frontend/dist/`：
```
dist/
├── index.html              # 入口 HTML
├── assets/
│   ├── index-xxx.css       # 样式 (≈37 kB)
│   ├── vendor-xxx.js       # 第三方依赖 (≈96 kB)
│   ├── editor-xxx.js       # TipTap 编辑器 (≈412 kB)
│   └── index-xxx.js        # 业务代码 (≈430 kB)
```

### 3.2 后端生产启动

```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
alembic upgrade head

# 使用 Gunicorn + Uvicorn workers (推荐)
uv pip install gunicorn
gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers 4 \
  --bind 0.0.0.0:8000 \
  --timeout 120 \
  --max-requests 1000 \
  --max-requests-jitter 50
```

> **说明**: 生产环境建议使用 4 个 worker (CPU 核心数 × 2)。`max-requests` 防止内存泄漏。

### 3.3 生产环境变量

创建 `backend/.env`，设置以下内容：

```ini
APP_NAME=Minimail
APP_VERSION=0.12
DEBUG=false

DATABASE_URL=postgresql+asyncpg://webmail:密码@localhost:5432/webmail
REDIS_URL=redis://localhost:6379/0

# ⚠️ 务必使用强随机密钥
SECRET_KEY=$(openssl rand -hex 32)
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# ⚠️ 必须 32 字符
ENCRYPTION_KEY=$(openssl rand -base64 32 | cut -c1-32)

CORS_ORIGINS=["https://你的域名.com"]
```

---

## 4. 环境变量

### 后端 (`backend/.env`)

| 变量 | 默认值 | 必填 | 说明 |
|------|--------|:----:|------|
| `APP_NAME` | Minimail | | 应用名称 |
| `APP_VERSION` | 0.12 | | 版本号 |
| `DEBUG` | false | | 调试模式 (生产环境必须 false) |
| `DATABASE_URL` | | ✅ | PostgreSQL 连接串 (asyncpg) |
| `REDIS_URL` | redis://localhost:6379/0 | | Redis 连接串 (可选) |
| `SECRET_KEY` | | ✅ | JWT 签名密钥 (64 字符随机 hex) |
| `JWT_ALGORITHM` | HS256 | | JWT 签名算法 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 15 | | 访问令牌过期时间 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | | 刷新令牌过期天数 |
| `ENCRYPTION_KEY` | | ✅ | IMAP/SMTP 密码加密密钥 (32 字符) |
| `CORS_ORIGINS` | ["http://localhost:5173"] | | 允许的 CORS 域名列表 |

### 生成密钥

```bash
# SECRET_KEY: 64 字符随机 hex
openssl rand -hex 32

# ENCRYPTION_KEY: 32 字符
openssl rand -base64 32 | cut -c1-32
```

---

## 5. 数据库

### 5.1 PostgreSQL 配置

```sql
-- 创建数据库和用户
CREATE USER webmail WITH PASSWORD 'your_strong_password';
CREATE DATABASE webmail OWNER webmail;

-- 启用 pgvector (如使用标准 PG 镜像)
\c webmail
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- 用于模糊搜索

-- 授权
GRANT ALL PRIVILEGES ON DATABASE webmail TO webmail;
```

### 5.2 运行迁移

```bash
cd backend
source .venv/bin/activate
alembic upgrade head
```

迁移状态查看：

```bash
alembic current        # 当前迁移版本
alembic history        # 迁移历史
```

### 5.3 创建管理员

系统首次启动时自动跳转 `/setup` 页面创建管理员。
或者直接注册第一个用户：

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YourPassword123!",
    "username": "admin"
  }'
```

---

## 6. Nginx 反向代理

### 6.1 配置示例

```nginx
# /etc/nginx/sites-available/minimail
server {
    listen 80;
    server_name minimail.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name minimail.example.com;

    ssl_certificate     /etc/letsencrypt/live/minimail.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/minimail.example.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # 前端静态文件
    root /var/www/minimail/frontend/dist;
    index index.html;

    # API 反向代理到后端
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持 (SSE 兼容)
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
    }

    # SSE 端点 (不缓冲)
    location /api/notes/events {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding on;
    }

    # 文件上传大小限制 (附件)
    client_max_body_size 50M;

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 6.2 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/minimail /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Docker 部署

### 7.1 Docker Compose

创建 `docker-compose.yml`：

```yaml
version: "3.8"

services:
  postgres:
    image: pgvector/pgvector:pg17
    environment:
      POSTGRES_USER: webmail
      POSTGRES_PASSWORD: ${DB_PASSWORD:-webmail_prod}
      POSTGRES_DB: webmail
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U webmail"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql+asyncpg://webmail:${DB_PASSWORD:-webmail_prod}@postgres:5432/webmail
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      CORS_ORIGINS: '["https://${DOMAIN}"]'
      DEBUG: "false"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  pgdata:
  redisdata:
```

### 7.2 构建并启动

```bash
# 创建 .env 文件
cat > .env << EOF
DB_PASSWORD=your_strong_password
SECRET_KEY=$(openssl rand -hex 32)
ENCRYPTION_KEY=$(openssl rand -base64 32 | cut -c1-32)
DOMAIN=minimail.example.com
EOF

docker compose up -d
docker compose exec backend alembic upgrade head
```

---

## 8. 系统架构

```
┌──────────────┐     ┌──────────────┐
│  浏览器      │────▶│  Nginx       │
│  (React SPA) │     │  port 443    │
└──────────────┘     └──────┬───────┘
                            │
                    ┌───────┴────────┐
                    │  /api/*        │
                    │  /api/notes/*  │
                    │  /api/shares/* │
                    └───────┬────────┘
                            │
              ┌─────────────┴─────────────┐
              │  FastAPI (Uvicorn/Gunicorn)│
              │  port 8000                 │
              └──────┬────────────┬────────┘
                     │            │
              ┌──────┴───┐  ┌────┴────┐
              │PostgreSQL│  │  Redis  │
              │  +vector │  │ (可选)  │
              └──────────┘  └─────────┘
```

---

## 9. 备份与维护

### 9.1 数据库备份

```bash
# 每日备份
pg_dump -U webmail -h localhost webmail > backup_$(date +%Y%m%d).sql

# 恢复
psql -U webmail -h localhost webmail < backup_20260707.sql
```

### 9.2 更新

```bash
# 拉取最新代码
git pull origin main

# 更新依赖
cd backend && source .venv/bin/activate && uv pip install -r requirements.txt

# 运行新迁移
alembic upgrade head

# 重建前端
cd frontend && npm install && npm run build

# 重启后端
systemctl restart minimail   # 或 supervisorctl restart minimail
```

### 9.3 日志查看

```bash
# 后端日志
journalctl -u minimail -f          # systemd
tail -f /var/log/minimail/error.log  # 文件日志

# Nginx 日志
tail -f /var/log/nginx/minimail-access.log
tail -f /var/log/nginx/minimail-error.log
```

### 9.4 健康检查

```bash
# API 健康检查
curl https://minimail.example.com/api/health
# → {"status": "ok", "database": "ok", "version": "0.12"}

# PostgreSQL 检查
pg_isready -U webmail -h localhost
```

---

## 10. 故障排查

### 10.1 数据库连接失败

```bash
# 检查 PostgreSQL 运行状态
systemctl status postgresql
# 或 Docker
docker ps | grep postgres

# 测试连接
psql -U webmail -h localhost -d webmail -c "SELECT 1"

# 检查 pgvector 扩展
psql -U webmail -h localhost -d webmail -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

### 10.2 前端空白页

```bash
# 检查后端是否运行
curl http://localhost:8000/api/health

# 检查 Nginx 配置
sudo nginx -t

# 检查浏览器控制台 (F12)
# 常见原因: CORS 配置错误 / API 代理未生效 / SPA 路由未回退
```

### 10.3 IMAP 连接失败

```
常见原因:
  1. IMAP 服务器地址或端口配置错误
  2. 需要应用密码 (如 Gmail 需开启 2FA + 应用专用密码)
  3. SSL/TLS 配置不匹配
  4. 防火墙阻止端口连接

排查:
  - 使用邮箱设置向导自动检测
  - 手动测试: openssl s_client -connect imap.gmail.com:993
```
