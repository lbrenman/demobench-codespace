#!/bin/bash
# send-test-trace.sh
# Sends a test OTLP trace to the local collector via HTTP
# Usage: ./send-test-trace.sh [host] [port]
#
# Default: localhost:4318 (HTTP)
# In a Codespace, use the forwarded port URL from the Ports tab

HOST=${1:-localhost}
PORT=${2:-4318}
ENDPOINT="http://${HOST}:${PORT}/v1/traces"

TRACE_ID=$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 32 | head -n 1)
SPAN_ID=$(cat /dev/urandom | tr -dc 'a-f0-9' | fold -w 16 | head -n 1)
START_TIME=$(date -u +%s%N)
END_TIME=$((START_TIME + 1000000000))

echo "Sending test trace to ${ENDPOINT}"
echo "Trace ID: ${TRACE_ID}"
echo "Span ID:  ${SPAN_ID}"

curl -s -o /dev/null -w "HTTP status: %{http_code}\n" \
  -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"resourceSpans\": [{
      \"resource\": {
        \"attributes\": [{
          \"key\": \"service.name\",
          \"value\": { \"stringValue\": \"test-service\" }
        }, {
          \"key\": \"service.version\",
          \"value\": { \"stringValue\": \"1.0.0\" }
        }, {
          \"key\": \"deployment.environment\",
          \"value\": { \"stringValue\": \"codespace\" }
        }]
      },
      \"scopeSpans\": [{
        \"scope\": {
          \"name\": \"test-instrumentation\",
          \"version\": \"1.0.0\"
        },
        \"spans\": [{
          \"traceId\": \"${TRACE_ID}\",
          \"spanId\": \"${SPAN_ID}\",
          \"name\": \"test-span\",
          \"kind\": 1,
          \"startTimeUnixNano\": \"${START_TIME}\",
          \"endTimeUnixNano\": \"${END_TIME}\",
          \"status\": { \"code\": 1 },
          \"attributes\": [{
            \"key\": \"test\",
            \"value\": { \"stringValue\": \"true\" }
          }, {
            \"key\": \"http.method\",
            \"value\": { \"stringValue\": \"GET\" }
          }, {
            \"key\": \"http.url\",
            \"value\": { \"stringValue\": \"http://example.com/api/test\" }
          }]
        }]
      }]
    }]
  }"

echo ""
echo "Check New Relic APM > Distributed Tracing for trace ID: ${TRACE_ID}"
