#!/bin/bash
# Pull an Ollama model
# Usage: ./scripts/pull-model.sh [model]
# Examples:
#   ./scripts/pull-model.sh phi3:mini
#   ./scripts/pull-model.sh llama3.2:3b
#   ./scripts/pull-model.sh mistral:7b
#   ./scripts/pull-model.sh deepseek-r1:7b

MODEL=${1:-phi3:mini}

if ! curl -s http://localhost:11434 > /dev/null 2>&1; then
  echo "Ollama is not running. Start it first with: ./scripts/start-with-ollama.sh"
  exit 1
fi

echo "Pulling: $MODEL"
ollama pull "$MODEL"

echo ""
echo "Available models:"
ollama list
