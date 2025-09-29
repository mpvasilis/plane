#!/bin/bash

# Test script for Plane proxy configuration
echo "🚀 Testing Plane Proxy Configuration..."
echo "====================================="

# Get the proxy URL
PROXY_URL="http://localhost:${LISTEN_HTTP_PORT:-80}"

# Function to test endpoint
test_endpoint() {
    local path="$1"
    local name="$2"
    local expected_code="${3:-200}"

    echo -n "Testing $name ($path)... "

    if response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$PROXY_URL$path" 2>/dev/null); then
        if [ "$response" = "$expected_code" ]; then
            echo "✅ OK ($response)"
        else
            echo "⚠️  Got $response (expected $expected_code)"
        fi
    else
        echo "❌ FAILED (connection error)"
    fi
}

# Wait for proxy to be ready
echo "Waiting for proxy to be ready..."
timeout=30
while [ $timeout -gt 0 ]; do
    if curl -s "$PROXY_URL/health" > /dev/null 2>&1; then
        echo "✅ Proxy is ready!"
        break
    fi
    echo -n "."
    sleep 1
    timeout=$((timeout - 1))
done

if [ $timeout -eq 0 ]; then
    echo "❌ Proxy failed to start within 30 seconds"
    exit 1
fi

echo ""

# Test all endpoints
test_endpoint "/health" "Health Check"
test_endpoint "/" "Web Application"
test_endpoint "/api/workspaces/" "API Endpoint" "401"
test_endpoint "/god-mode/" "Admin Interface"
test_endpoint "/spaces/" "Space Interface"
test_endpoint "/live/" "Live Collaboration"
test_endpoint "/uploads/" "MinIO Upload Endpoint" "403"

echo ""
echo "🎉 Proxy test completed!"
echo ""
echo "Available services:"
echo "- Web Application: $PROXY_URL/"
echo "- Admin Panel: $PROXY_URL/god-mode/"
echo "- Public Spaces: $PROXY_URL/spaces/"
echo "- Live Collaboration: $PROXY_URL/live/"
echo "- API: $PROXY_URL/api/"
echo "- File Storage: $PROXY_URL/uploads/"