#!/bin/bash
# Start Open WebUI with Ollama (local models) + optional external APIs
# Recommended Codespace machine: 4-core/16GB minimum, 8-core/32GB preferred

set -e

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
else
  echo "ERROR: .env file not found. Copy .env.example to .env first."
  exit 1
fi

echo "========================================="
echo " Starting Open WebUI + Ollama"
echo "========================================="

# Install Ollama if not present
if ! command -v ollama &> /dev/null; then
  echo ">>> Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

# Start Ollama
echo ">>> Starting Ollama..."
pkill ollama 2>/dev/null || true
sleep 1
OLLAMA_HOST=0.0.0.0 ollama serve &

# Wait for Ollama to be ready
echo ">>> Waiting for Ollama..."
for i in {1..30}; do
  if curl -s http://localhost:11434 > /dev/null 2>&1; then
    echo ">>> Ollama ready!"
    break
  fi
  sleep 2
done

# Pull default model
DEFAULT_MODEL=${OLLAMA_DEFAULT_MODEL:-phi3:mini}
echo ""
echo ">>> Pulling model: $DEFAULT_MODEL"
ollama pull "$DEFAULT_MODEL"

# Stop and remove existing Open WebUI container
docker stop open-webui 2>/dev/null || true
docker rm open-webui 2>/dev/null || true

# Build docker run args
DOCKER_ARGS=(
  -d
  --name open-webui
  --restart always
  -p 3000:8080
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434
  -v open-webui:/app/backend/data
  --add-host=host.docker.internal:host-gateway
)

# Add OpenAI key if set
if [ -n "$OPENAI_API_KEY" ]; then
  echo ">>> OpenAI API key detected"
  DOCKER_ARGS+=(-e OPENAI_API_KEY="$OPENAI_API_KEY")
fi

# Add custom base URL if set
if [ -n "$OPENAI_API_BASE_URL" ]; then
  echo ">>> Custom API base URL: $OPENAI_API_BASE_URL"
  DOCKER_ARGS+=(-e OPENAI_API_BASE_URL="$OPENAI_API_BASE_URL")
fi

# Add Anthropic key if set
if [ -n "$ANTHROPIC_API_KEY" ]; then
  echo ">>> Anthropic API key detected"
  DOCKER_ARGS+=(-e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY")
fi

docker run "${DOCKER_ARGS[@]}" ghcr.io/open-webui/open-webui:main

echo ""
echo "========================================="
echo " Open WebUI starting on port 3000"
echo " Ollama API on port 11434"
echo ""
echo " Available models:"
ollama list
echo "========================================="
echo ""
echo " To pull more models:"
echo "   ./scripts/pull-model.sh mistral:7b"
