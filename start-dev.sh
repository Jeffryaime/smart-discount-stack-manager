#!/bin/bash

# Smart Discount Stack Manager - Stable Development Startup Script

echo "🧹 Cleaning up any existing processes..."
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "nodemon.*app.js" 2>/dev/null || true
sleep 2

echo "🚀 Starting backend server..."
cd backend && npm run dev &
BACKEND_PID=$!

# Check if backend npm command succeeded
if [ $? -ne 0 ]; then
    echo "❌ Failed to start backend server. Exiting."
    exit 1
fi

# Wait for backend to start
sleep 5

echo "🎨 Starting frontend server with optimizations..."
cd ../frontend && GENERATE_SOURCEMAP=false FAST_REFRESH=false PORT=3003 npm start &
FRONTEND_PID=$!

# Check if frontend npm command succeeded
if [ $? -ne 0 ]; then
    echo "❌ Failed to start frontend server. Exiting."
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Servers started!"
echo "📊 Backend: http://localhost:3000"
echo "🖥️  Frontend: http://localhost:3003"
echo "🛍️  App URL: http://localhost:3003/?shop=jaynorthcode.myshopify.com"
echo ""
echo "💡 Tips to prevent crashes:"
echo "   - Don't edit files while server is starting"
echo "   - Use Ctrl+C once to stop servers gracefully"
echo "   - If servers crash, run this script again"
echo ""

# Handle cleanup on exit
trap 'echo "🛑 Stopping servers..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit' INT TERM

# Wait for processes
wait
