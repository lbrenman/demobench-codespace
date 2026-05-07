#!/bin/bash
set -e

echo "============================================"
echo " DemoBench — Resuming Codespace"
echo "============================================"

# Ensure .env exists (safety net for rebuild scenarios)
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠️  .env was missing — recreated from .env.example"
fi

# Recreate data directories in case of rebuild
mkdir -p data/postgres data/keycloak-postgres
mkdir -p services/litellm/data services/open-webui/data services/sftp/upload
mkdir -p services/keycloak/imports

# Restart any containers that were running before the Codespace stopped.
# Docker Compose restart=unless-stopped handles most services automatically,
# but we explicitly restart core to guarantee dashboard is up.
echo "🔄 Restarting core services..."
docker compose --profile core up -d 2>/dev/null || true

echo "✅ Core services running"
echo "   Dashboard: http://localhost:4500"
echo ""

# Re-seed Node.js services if postgres just came up
# (uses ON CONFLICT DO NOTHING so existing data is preserved)
echo "🌱 Ensuring database seeds are current..."
sleep 3  # give postgres a moment to accept connections

if docker compose ps postgres 2>/dev/null | grep -q "running"; then
  for svc in multi-api-mock fhir-api; do
    if [ -f "services/$svc/package.json" ]; then
      script=$(node -e "const p=require('./services/$svc/package.json'); console.log(p.scripts && p.scripts.seed ? 'seed' : '')" 2>/dev/null)
      if [ -n "$script" ]; then
        echo "  Seeding $svc..."
        (cd "services/$svc" && npm run seed --silent 2>/dev/null) || true
      fi
    fi
  done
fi

echo "✅ Ready"
