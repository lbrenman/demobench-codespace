#!/bin/bash
set -e

echo "============================================"
echo " DemoBench — First-time setup"
echo "============================================"

# Copy .env.example → .env if not already present
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env from .env.example"
  echo "   Edit .env to add any required API keys before starting services."
else
  echo "ℹ️  .env already exists — skipping copy"
fi

# Create persistent data directories (gitignored)
mkdir -p data/postgres
mkdir -p data/keycloak-postgres
mkdir -p services/litellm/data
mkdir -p services/open-webui/data
mkdir -p services/sftp/upload
mkdir -p services/keycloak/imports
echo "✅ Created persistent data directories"

# Install dashboard dependencies
echo "📦 Installing dashboard dependencies..."
cd dashboard
npm install
echo "✅ Dashboard dependencies installed"
cd ..

# Install Node.js service dependencies
for svc in multi-api-mock fhir-api fhir-web metric-sse railway-sse; do
  if [ -f "services/$svc/package.json" ]; then
    echo "📦 Installing $svc dependencies..."
    (cd "services/$svc" && npm install --silent)
    echo "✅ $svc ready"
  fi
done

# Start core services (postgres + dashboard + portainer)
echo ""
echo "🚀 Starting core services (postgres, dashboard, portainer)..."
docker compose --profile core up -d --build
echo "✅ Core services started"

echo ""
echo "============================================"
echo " Setup complete!"
echo " Dashboard: http://localhost:4500"
echo " Portainer: http://localhost:9000"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env to add any API keys (LiteLLM, New Relic, ngrok)"
echo "  2. Start services:  docker compose --profile <profile> up -d"
echo "  3. Or start all:    docker compose --profile all up -d"
echo ""
echo "Available profiles: core, apis, sse, ai, security, observability, sftp, all"
