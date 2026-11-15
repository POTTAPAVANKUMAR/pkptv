#!/bin/bash
# PKP TV Local Development Startup Script

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================="
echo " Starting PKP TV (Local Development Mode) "
echo "=========================================="

# 1. Ensure backend virtualenv exists
if [ ! -d "backend/venv" ]; then
    echo "Creating Python virtual environment in backend/venv..."
    python3 -m venv backend/venv
    ./backend/venv/bin/pip install -r backend/requirements.txt
fi

# 2. Ensure frontend node_modules exist
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Trap to kill both processes on Ctrl+C
cleanup() {
    echo ""
    echo "Stopping PKP TV services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start Backend API
echo "Starting FastAPI Backend on http://localhost:8085 ..."
./backend/venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8085 --reload --app-dir backend &
BACKEND_PID=$!

# Wait for backend to initialize
sleep 2

# Start Frontend Vite Dev Server
echo "Starting Vite Frontend on http://localhost:3005 ..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================================"
echo " PKP TV is live!"
echo " Web Player: http://localhost:3005"
echo " API Docs:   http://localhost:8085/docs"
echo " Health:     http://localhost:8085/health"
echo "========================================================"
echo "Press Ctrl+C to stop all servers."

wait
