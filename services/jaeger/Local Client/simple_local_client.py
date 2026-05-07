#!/usr/bin/env python3
"""
Ultra-simple local client that sends traces to Jaeger via OTLP HTTP.
Uses basic JSON - no complex dependencies needed.
"""

import json
import time
import random
import requests
from datetime import datetime

# 🔧 CONFIGURATION - UPDATE THIS!
# Replace with your Codespace URL pattern
CODESPACE_BASE = "orange-happiness-jjj4p7g7r2qw9g"  # ← UPDATE THIS!
OTLP_ENDPOINT = f"https://{CODESPACE_BASE}-4318.app.github.dev/v1/traces"


def generate_trace_id():
    """Generate a random trace ID as hex string."""
    return ''.join([f'{random.randint(0, 255):02x}' for _ in range(16)])


def generate_span_id():
    """Generate a random span ID as hex string."""
    return ''.join([f'{random.randint(0, 255):02x}' for _ in range(8)])


def nano_timestamp():
    """Get current time in nanoseconds since epoch."""
    return int(time.time() * 1_000_000_000)


def create_otlp_trace(operation_name, duration_seconds=0.5):
    """Create a simple OTLP format trace."""
    
    trace_id = generate_trace_id()
    span_id = generate_span_id()
    start_time_ns = nano_timestamp()
    
    # Simulate some work
    time.sleep(duration_seconds)
    end_time_ns = nano_timestamp()
    
    # OTLP JSON format
    trace = {
        "resourceSpans": [
            {
                "resource": {
                    "attributes": [
                        {
                            "key": "service.name",
                            "value": {"stringValue": "local-client"}
                        },
                        {
                            "key": "host.name",
                            "value": {"stringValue": "local-machine"}
                        }
                    ]
                },
                "scopeSpans": [
                    {
                        "scope": {
                            "name": "simple-client",
                            "version": "1.0.0"
                        },
                        "spans": [
                            {
                                "traceId": trace_id,
                                "spanId": span_id,
                                "name": operation_name,
                                "kind": 1,  # SPAN_KIND_INTERNAL
                                "startTimeUnixNano": str(start_time_ns),
                                "endTimeUnixNano": str(end_time_ns),
                                "attributes": [
                                    {
                                        "key": "operation.type",
                                        "value": {"stringValue": "test"}
                                    },
                                    {
                                        "key": "client.location",
                                        "value": {"stringValue": "local"}
                                    }
                                ],
                                "status": {
                                    "code": 1  # STATUS_CODE_OK
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    }
    
    return trace


def send_trace(trace):
    """Send trace to Jaeger via OTLP HTTP."""
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(OTLP_ENDPOINT, json=trace, headers=headers, timeout=10)
        
        if response.status_code == 200:
            return True, "Success"
        else:
            return False, f"HTTP {response.status_code}: {response.text[:200]}"
            
    except requests.exceptions.RequestException as e:
        return False, str(e)


def main():
    print("🚀 Ultra-Simple Local Jaeger Client")
    print("=" * 60)
    print(f"📡 OTLP Endpoint: {OTLP_ENDPOINT}")
    print("=" * 60)
    print()
    
    operations = [
        "local.database_query",
        "local.api_call", 
        "local.file_processing"
    ]
    
    for i, operation in enumerate(operations, 1):
        print(f"📤 Sending trace {i}/{len(operations)}: {operation}")
        
        trace = create_otlp_trace(operation, duration_seconds=0.3)
        success, message = send_trace(trace)
        
        if success:
            print(f"  ✅ Trace sent successfully!")
        else:
            print(f"  ❌ Failed: {message}")
        
        print()
        time.sleep(0.5)
    
    print("=" * 60)
    print("✅ Done! Check your Jaeger UI:")
    ui_url = f"https://{CODESPACE_BASE}-16686.app.github.dev/search"
    print(f"   {ui_url}")
    print()
    print("🔍 In Jaeger UI:")
    print("   1. Select 'local-client' from Service dropdown")
    print("   2. Click 'Find Traces'")
    print("   3. You should see 3 traces")
    print()
    print("💡 If no traces appear:")
    print("   - Verify CODESPACE_BASE is correct (line 13)")
    print("   - Check port 4318 is forwarded in your Codespace")
    print("   - In Codespace, run: docker compose logs jaeger")


if __name__ == "__main__":
    main()