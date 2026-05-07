#!/bin/bash
# Start Open WebUI with external LLM APIs only (no Ollama)
# Requires: OPENAI_API_KEY in .env (and/or OPENAI_API_BASE_URL for LiteLLM)
# Recommended Codespace machine: 2-core/8GB is sufficient

set -e

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
else
  echo "ERROR: .env file not found. Copy .env.example to .env and add your API keys."
  exit 1
fi

# Validate at least one API key is set
if [ -z "$OPENAI_API_KEY" ] && [ -z "$OPENAI_API_BASE_URL" ]; then
  echo "ERROR: No API key configured."
  echo "Set OPENAI_API_KEY or OPENAI_API_BASE_URL in your .env file."
  exit 1
fi

echo "========================================="
echo " Starting Open WebUI (external APIs only)"
echo "========================================="

# Stop and remove existing container if running
docker stop open-webui 2>/dev/null || true
docker rm open-webui 2>/dev/null || true

# Build docker run args
DOCKER_ARGS=(
  -d
  --name open-webui
  --restart always
  -p 3000:8080
  -v open-webui:/app/backend/data
  --add-host=host.docker.internal:host-gateway
)

# Disable Ollama (set to empty so Open WebUI doesn't try to connect)
DOCKER_ARGS+=(-e OLLAMA_BASE_URL="")
DOCKER_ARGS+=(-e ENABLE_OLLAMA_API=false)

# Add OpenAI key if set
if [ -n "$OPENAI_API_KEY" ]; then
  echo ">>> OpenAI API key detected"
  DOCKER_ARGS+=(-e OPENAI_API_KEY="$OPENAI_API_KEY")
fi

# Add custom base URL if set (e.g. LiteLLM proxy)
if [ -n "$OPENAI_API_BASE_URL" ]; then
  echo ">>> Custom API base URL: $OPENAI_API_BASE_URL"
  DOCKER_ARGS+=(-e OPENAI_API_BASE_URL="$OPENAI_API_BASE_URL")
fi

# Add Anthropic key if set (used by Open WebUI's Anthropic pipe)
if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo ">>> Anthropic API key detected"
  DOCKER_ARGS+=(-e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY")
fi

docker run "${DOCKER_ARGS[@]}" ghcr.io/open-webui/open-webui:main

echo ""
echo "========================================="
echo " Open WebUI starting on port 3000"
echo " (may take ~30s on first Docker pull)"
echo "========================================="
