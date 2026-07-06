.PHONY: dev dev-backend dev-frontend build test lint docs clean

# ── 开发环境 ──

dev: ## 启动所有服务 (Docker Compose)
	docker compose -f docker/docker-compose.yml up -d

dev-backend: ## 启动后端 (本地开发模式, 需要 postgres+redis 在 docker 中运行)
	cd backend && PATH="$$PWD/.venv/bin:$$PATH" uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend: ## 启动前端 (Vite 开发服务器)
	cd frontend && npm run dev

dev-db: ## 仅启动数据库依赖
	docker compose -f docker/docker-compose.yml up -d postgres redis

# ── 构建 ──

build: ## 构建生产镜像
	docker compose -f docker/docker-compose.yml build

# ── 测试 ──

test: ## 运行所有测试
	cd backend && PATH="$$PWD/.venv/bin:$$PATH" python -m pytest tests/ -v

test-backend: ## 运行后端测试
	cd backend && PATH="$$PWD/.venv/bin:$$PATH" python -m pytest tests/ -v

test-frontend: ## 运行前端测试
	cd frontend && npx vitest run

# ── Lint ──

lint: ## 运行所有 linter
	cd backend && PATH="$$PWD/.venv/bin:$$PATH" ruff check app/
	cd frontend && npx eslint src/

# ── 数据库 ──

migrate: ## 运行数据库迁移
	cd backend && PATH="$$PWD/.venv/bin:$$PATH" PYTHONPATH="$$PWD" alembic upgrade head

migrate-new: ## 创建新迁移
	cd backend && PATH="$$PWD/.venv/bin:$$PATH" PYTHONPATH="$$PWD" alembic revision --autogenerate -m "$(name)"

# ── 文档 ──

docs: ## 启动文档服务器
	@echo "查看 docs/DEVELOPMENT_PLAN.md"

# ── 清理 ──

clean: ## 清理构建产物
	rm -rf frontend/dist
	rm -rf backend/.venv
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
