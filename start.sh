#!/bin/bash
# AI Caption Studio - Mac startup script
set -e

echo "🎬 Starting AI Caption Studio..."

# Check dependencies
if ! command -v ffmpeg &>/dev/null; then
  echo "❌ FFmpeg not found. Install with: brew install ffmpeg"
  exit 1
fi

if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 not found."
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org"
  exit 1
fi

echo "✓ Dependencies found"

# Start backend
echo "📡 Starting backend on http://localhost:8000..."
cd backend
if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
  source .venv/bin/activate
  pip install --upgrade pip
  pip install -r requirements.txt
else
  source .venv/bin/activate
fi
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Start frontend
echo "🖥  Starting frontend on http://localhost:5173..."
cd frontend
if [ ! -d "node_modules" ]; then
  echo "Installing frontend dependencies..."
  npm install
fi
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ AI Caption Studio is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers."

trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
