# 安装指南

## 前置要求

- **Docker** + **Docker Compose** (推荐)
- 或本地安装: Python 3.11+ / Node.js 20+ / PostgreSQL 16+ / Redis 7+

## 方式一: Docker Compose (推荐)

```bash
# 1. 克隆仓库
git clone https://github.com/Leorand-dev/webmail.git
cd webmail

# 2. 配置环境变量 (可选)
cp backend/.env.example backend/.env

# 3. 启动所有服务
make dev
# 或: cd docker && docker compose up -d

# 4. 运行数据库迁移
make migrate

# 5. 打开浏览器
# 前端: http://localhost:3000
# 后端 API: http://localhost:8000/docs
```

## 方式二: 本地开发

### 后端

```bash
cd backend

# 1. 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 中的数据库/Redis 连接信息

# 4. 启动数据库
make dev-db
# 或手动启动 PostgreSQL + Redis

# 5. 运行迁移
PYTHONPATH="$PWD" alembic upgrade head

# 6. 启动开发服务器
make dev-backend
# 或: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端

```bash
cd frontend

# 1. 安装依赖
npm install

# 2. 启动开发服务器
make dev-frontend
# 或: npm run dev
# 访问 http://localhost:5173 (API 自动代理到 :8000)
```

## 验证安装

```bash
# 健康检查
curl http://localhost:8000/health
# → {"status":"ok","version":"0.1.0","uptime_seconds":...}

# 注册新用户
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"[YOUR_PASSWORD]","name":"测试"}'

# 登录
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"[YOUR_PASSWORD]"}'
```

## 项目结构

```
webmail/
├── backend/          FastAPI 后端
│   ├── app/          应用代码
│   │   ├── api/      HTTP 路由
│   │   ├── models/   ORM 模型
│   │   ├── schemas/  Pydantic 序列化
│   │   ├── services/ 业务逻辑
│   │   └── agent/    AI Agent 模块
│   ├── migrations/   Alembic 迁移
│   └── tests/        测试
├── frontend/         React SPA 前端
│   └── src/          源代码
├── docker/           Docker Compose 配置
└── docs/             文档
```
