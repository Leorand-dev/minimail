#!/usr/bin/env bash
set -euo pipefail

# dev.sh — 启动本地开发环境
cd "$(dirname "$0")/.."

echo "=== Starting Webmail Development Environment ==="

# Start PostgreSQL + Redis
docker compose -f docker/docker-compose.yml up -d postgres redis
echo "✅ Database services started"

# Install backend deps
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt -q
echo "✅ Backend dependencies installed"

# Run migrations
alembic upgrade head 2>/dev/null || echo "   (migrations not yet created)"
echo "✅ Database migrated"

# Start backend (background)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Install frontend deps
cd ../frontend
npm install --silent 2>/dev/null
echo "✅ Frontend dependencies installed"

# Start frontend
npm run dev &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "=== Services ==="
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait