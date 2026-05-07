#!/bin/bash
# Quick smoke-test for the LiteLLM proxy

BASE_URL="${LITELLM_BASE_URL:-http://localhost:4000}"
MASTER_KEY="${LITELLM_MASTER_KEY:-sk-changeme-masterkey}"
MODEL="${1:-gpt-4o-mini}"

echo "🧪 Testing LiteLLM proxy at $BASE_URL"
echo "   Model: $MODEL"
echo ""

# 1. Health check
echo "── Health Check ──────────────────────────────"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""

# 2. List models
echo "── Available Models ──────────────────────────"
curl -s "$BASE_URL/v1/models" \
  -H "Authorization: Bearer $MASTER_KEY" | python3 -m json.tool
echo ""

# 3. Chat completion
echo "── Chat Completion ($MODEL) ──────────────────"
curl -s "$BASE_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $MASTER_KEY" \
  -d "{
    \"model\": \"$MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Say hello in one sentence.\"}],
    \"max_tokens\": 50
  }" | python3 -m json.tool
echo ""

echo "✅ Done. Pass a model name as an argument to test a specific model:"
echo "   bash scripts/test.sh claude-sonnet"
