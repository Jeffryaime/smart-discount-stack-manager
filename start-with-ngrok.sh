#!/bin/bash

# Smart Discount Stack Manager - Startup with ngrok
echo "🚀 Starting Smart Discount Stack Manager with ngrok..."

# Function to check if jq is available
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo "❌ Error: jq is required but not installed. Please install jq to parse JSON responses."
        echo "   Install with: brew install jq (macOS) or apt-get install jq (Ubuntu/Debian)"
        exit 1
    fi
}

# Function to get ngrok URL with proper error handling
get_ngrok_url() {
    local response
    local public_url

    # Check if ngrok API is accessible
    if ! response=$(curl -s --max-time 10 http://127.0.0.1:4040/api/tunnels 2>/dev/null); then
        echo "❌ Error: Cannot connect to ngrok API at http://127.0.0.1:4040"
        return 1
    fi

    # Check if response is valid JSON
    if ! echo "$response" | jq empty 2>/dev/null; then
        echo "❌ Error: Invalid JSON response from ngrok API"
        return 1
    fi

    # Extract public_url using jq
    public_url=$(echo "$response" | jq -r '.tunnels[] | select(.config.addr == "localhost:3000") | .public_url' 2>/dev/null)

    if [ -z "$public_url" ] || [ "$public_url" = "null" ]; then
        echo "❌ Error: No ngrok tunnel found for localhost:3000"
        return 1
    fi

    echo "$public_url"
    return 0
}

# Function to check if ngrok tunnel exists for port 3000
check_ngrok_tunnel() {
    local response

    if ! response=$(curl -s --max-time 10 http://127.0.0.1:4040/api/tunnels 2>/dev/null); then
        return 1
    fi

    if echo "$response" | jq -e '.tunnels[] | select(.config.addr == "localhost:3000")' >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check if jq is available
check_jq

# Check if ngrok is already running on port 3000
if check_ngrok_tunnel; then
    echo "✅ Ngrok tunnel already running"
    NGROK_URL=$(get_ngrok_url)
    if [ $? -eq 0 ]; then
        echo "🌐 Ngrok URL: $NGROK_URL"
    else
        echo "❌ Error: Failed to extract ngrok URL from existing tunnel"
        exit 1
    fi
else
    echo "🔗 Starting ngrok tunnel..."

    # Start ngrok in background
    ngrok http 3000 > /dev/null 2>&1 &
    NGROK_PID=$!

    # Wait for ngrok to start (max 30 seconds)
    echo "⏳ Waiting for ngrok to start..."
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if check_ngrok_tunnel; then
            break
        fi
        sleep 1
        attempts=$((attempts + 1))
    done

    # Check if ngrok started successfully
    if ! check_ngrok_tunnel; then
        echo "❌ Error: Failed to start ngrok tunnel after 30 seconds"
        echo "   Please check if ngrok is installed and working properly"
        kill $NGROK_PID 2>/dev/null
        exit 1
    fi

    # Get the ngrok URL
    NGROK_URL=$(get_ngrok_url)
    if [ $? -eq 0 ]; then
        echo "🌐 Ngrok URL: $NGROK_URL"
    else
        echo "❌ Error: Failed to extract ngrok URL after startup"
        kill $NGROK_PID 2>/dev/null
        exit 1
    fi
fi

# Verify NGROK_URL is not empty before proceeding
if [ -z "$NGROK_URL" ]; then
    echo "❌ Error: NGROK_URL is empty. Cannot proceed with startup."
    exit 1
fi

echo "📦 Starting development servers..."

# Start both servers with concurrently
npm run dev &
DEV_PID=$!

echo "✅ All services started!"
echo ""
echo "📍 Access your app at:"
echo "   Local:  http://localhost:3000/?shop=jaynorthcode.myshopify.com"
echo "   Ngrok:  $NGROK_URL/?shop=jaynorthcode.myshopify.com"
echo ""
echo "💡 Press Ctrl+C to stop all services"

# Handle cleanup on exit
trap 'echo "🛑 Stopping all services..."; kill $DEV_PID 2>/dev/null; [ ! -z "$NGROK_PID" ] && kill $NGROK_PID 2>/dev/null; exit' INT TERM

# Wait for dev process
wait $DEV_PID
