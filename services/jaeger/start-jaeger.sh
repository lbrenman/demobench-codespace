#!/bin/bash

echo "🚀 Starting Jaeger in Docker..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please wait for Docker to initialize."
    exit 1
fi

# Stop any existing containers
echo "🧹 Cleaning up any existing Jaeger containers..."
docker compose down 2>/dev/null

# Start Jaeger
echo "▶️  Starting Jaeger..."
docker compose up -d

# Wait for container to be ready
echo "⏳ Waiting for Jaeger to be ready..."
sleep 5

# Check status
echo ""
echo "📊 Container Status:"
docker compose ps

# Check if Jaeger is actually running
if docker compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Jaeger is running!"
    echo ""
    echo "🌐 Access Jaeger UI:"
    echo "   - Look for port 16686 in the 'Ports' tab"
    echo "   - Or try: http://localhost:16686"
    echo ""
    echo "📡 Collector endpoints:"
    echo "   - gRPC: localhost:4317"
    echo "   - HTTP: localhost:14268"
    echo ""
    echo "🧪 Test with: python sample_grpc_client.py"
else
    echo ""
    echo "❌ Jaeger failed to start. Checking logs..."
    docker compose logs
fi
