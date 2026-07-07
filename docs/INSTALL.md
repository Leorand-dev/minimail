# 安装指南

## 前置要求

- **Docker** + **Docker Compose** (推荐)
- 或本地安装: Python 3.11+ / Node.js 20+ / PostgreSQL 16+ / Redis 7+

## 方式一: Docker Compose (推荐)

```bash
# 1. 克隆仓库
git clone https://github.com/Leorand-dev/minimail.git
cd minimail

# 2. 配置环境变量
cp docker/.env.example docker/.env
# 编辑 docker/.env 填入 SECRET_KEY 和 ENCRYPTION_KEY

# 3. 启动所有服务
docker compose -f docker/docker-compose.yml up -d

# 4. 运行数据库迁移
docker compose -f docker/docker-compose.yml exec backend alembic upgrade head

# 5. 打开浏览器
# 前端: http://localhost
# 后端 API: http://localhost:8000/docs
```

## 方式二: 本地开发

### 后端

```bash
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 前端

```bash
cd frontend
npm install
npm run dev  # → http://localhost:5173
```

### 数据库

```bash
# Docker
docker run -d --name minimail-pg -e POSTGRES_USER=webmail -e POSTGRES_PASSWORD=webmail_dev -e POSTGRES_DB=webmail -p 5432:5432 pgvector/pgvector:pg16
```

## 详细说明

完整部署指南见 [🚀 部署指南](docs/system/operations/deployment.md)，包含：
- 生产环境 Gunicorn + Uvicorn 配置
- Nginx 反向代理 + SSL
- 环境变量说明
- 备份与维护
- 故障排查
