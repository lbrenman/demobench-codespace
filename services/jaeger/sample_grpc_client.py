#!/usr/bin/env python3
"""
Sample gRPC client that sends trace data to Jaeger.

This example demonstrates how to:
1. Configure OpenTelemetry to export traces via gRPC
2. Create spans with attributes and events
3. Create parent-child span relationships
4. Send traces to Jaeger running in the same Codespace
"""

import time
import random
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource


def configure_tracer():
    """Configure OpenTelemetry to send traces to Jaeger via gRPC."""
    
    # Create a resource to identify your service
    resource = Resource.create({
        "service.name": "sample-grpc-service",
        "service.version": "1.0.0",
        "deployment.environment": "development",
    })
    
    # Create tracer provider with resource
    provider = TracerProvider(resource=resource)
    
    # Configure OTLP exporter to send to Jaeger
    # Jaeger's OTLP gRPC endpoint is on port 4317
    otlp_exporter = OTLPSpanExporter(
        endpoint="http://localhost:4317",
        insecure=True,  # No TLS for local development
    )
    
    # Add span processor to handle export
    processor = BatchSpanProcessor(otlp_exporter)
    provider.add_span_processor(processor)
    
    # Set the global tracer provider
    trace.set_tracer_provider(provider)
    
    return trace.get_tracer(__name__)


def simulate_api_call(tracer, api_name, duration_ms):
    """Simulate an API call with a child span."""
    
    with tracer.start_as_current_span(f"api.{api_name}") as span:
        # Add attributes to the span
        span.set_attribute("http.method", "GET")
        span.set_attribute("http.url", f"https://api.example.com/{api_name}")
        span.set_attribute("http.status_code", 200)
        
        # Simulate work
        time.sleep(duration_ms / 1000.0)
        
        # Add an event to the span
        span.add_event("Response received", {
            "response.size": random.randint(100, 5000),
            "cache.hit": random.choice([True, False])
        })
        
        return {"status": "success", "data": f"{api_name} result"}


def simulate_database_query(tracer, query_type):
    """Simulate a database query with a child span."""
    
    with tracer.start_as_current_span(f"db.query.{query_type}") as span:
        # Add database-specific attributes
        span.set_attribute("db.system", "postgresql")
        span.set_attribute("db.operation", "SELECT")
        span.set_attribute("db.statement", f"SELECT * FROM {query_type}_table WHERE id = ?")
        
        # Simulate query execution
        query_time = random.uniform(0.05, 0.3)
        time.sleep(query_time)
        
        # Record query metrics
        span.add_event("Query completed", {
            "db.rows_returned": random.randint(1, 100),
            "db.duration_ms": query_time * 1000
        })
        
        return {"rows": random.randint(1, 100)}


def process_order(tracer, order_id):
    """Simulate processing an order with multiple steps."""
    
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.amount", random.uniform(10.0, 500.0))
        
        print(f"📦 Processing order {order_id}...")
        
        # Step 1: Validate order
        with tracer.start_as_current_span("validate_order") as validate_span:
            validate_span.add_event("Starting validation")
            time.sleep(0.1)
            validate_span.set_attribute("validation.passed", True)
            print(f"  ✓ Order validated")
        
        # Step 2: Check inventory
        inventory = simulate_database_query(tracer, "inventory")
        print(f"  ✓ Inventory checked ({inventory['rows']} items)")
        
        # Step 3: Call payment API
        payment_result = simulate_api_call(tracer, "payment", random.uniform(100, 300))
        print(f"  ✓ Payment processed")
        
        # Step 4: Call shipping API
        shipping_result = simulate_api_call(tracer, "shipping", random.uniform(150, 400))
        print(f"  ✓ Shipping arranged")
        
        # Step 5: Update order status
        with tracer.start_as_current_span("update_order_status") as update_span:
            simulate_database_query(tracer, "orders")
            update_span.set_attribute("status", "completed")
            print(f"  ✓ Order status updated")
        
        span.add_event("Order processing completed", {
            "order.id": order_id,
            "processing.duration_ms": 1000
        })
        
        print(f"✅ Order {order_id} completed!\n")


def main():
    """Main function to run the sample."""
    
    print("🚀 Starting Jaeger gRPC Sample Client\n")
    print("📡 Configuring OpenTelemetry to send traces to Jaeger...")
    
    # Configure the tracer
    tracer = configure_tracer()
    
    print("✅ Tracer configured successfully!\n")
    print("=" * 60)
    
    # Create a root span for the entire operation
    with tracer.start_as_current_span("sample_workflow") as root_span:
        root_span.set_attribute("workflow.type", "demo")
        root_span.set_attribute("workflow.version", "1.0")
        
        # Process multiple orders to generate interesting traces
        for i in range(3):
            order_id = f"ORD-{random.randint(10000, 99999)}"
            process_order(tracer, order_id)
            time.sleep(0.5)
        
        root_span.add_event("All orders processed")
    
    print("=" * 60)
    print("\n⏳ Flushing traces to Jaeger...")
    
    # Give the exporter time to flush
    time.sleep(2)
    
    print("✅ Done! Check the Jaeger UI on port 16686")
    print("\n📊 To view your traces:")
    print("   1. Go to the 'Ports' tab in Codespaces")
    print("   2. Click on the URL for port 16686")
    print("   3. Select 'sample-grpc-service' from the Service dropdown")
    print("   4. Click 'Find Traces'\n")


if __name__ == "__main__":
    main()
