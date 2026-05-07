#!/bin/bash
set -e

CONTAINER_NAME="postgres"
DB_NAME="fhir_r4_db"
DB_USER="api_user"
DB_PASS="api_pass"
DATA_DIR="$(pwd)/.pgdata"
SCHEMA_FILE="$(pwd)/src/db/schema.sql"

# Check Docker is available and running
if ! docker info > /dev/null 2>&1; then
  echo ""
  echo "ERROR: Docker is not running or not installed."
  echo "  - Mac/Windows: Start Docker Desktop"
  echo "  - Linux: run 'sudo systemctl start docker'"
  echo ""
  exit 1
fi

# Always remove and recreate — data lives in .pgdata/ bind mount
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing existing postgres container (data preserved in .pgdata/)..."
  docker rm -f "$CONTAINER_NAME" > /dev/null
fi

echo "Creating postgres container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -e POSTGRES_DB="$DB_NAME" \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASS" \
  -p 5432:5432 \
  -v "$DATA_DIR":/var/lib/postgresql/data \
  -v "$SCHEMA_FILE":/docker-entrypoint-initdb.d/01-schema.sql \
  postgres:16-alpine

echo "Waiting for postgres to be ready..."
until docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" 2>/dev/null; do
  sleep 1
done
echo "Postgres is ready."
