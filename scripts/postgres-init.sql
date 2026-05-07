-- =============================================================================
-- DemoBench PostgreSQL Initialization
-- This script runs once when the postgres container is first created.
-- It sets up schemas for each service within the shared 'demobench' database.
-- Keycloak uses its own dedicated database managed by keycloak-db container.
-- =============================================================================

-- Schemas within the shared demobench database
CREATE SCHEMA IF NOT EXISTS mock_api;
CREATE SCHEMA IF NOT EXISTS fhir;
CREATE SCHEMA IF NOT EXISTS dashboard_logs;

-- Grant all privileges to the demobench user on all schemas
GRANT ALL ON SCHEMA mock_api TO demobench;
GRANT ALL ON SCHEMA fhir TO demobench;
GRANT ALL ON SCHEMA dashboard_logs TO demobench;

-- Set default search paths so services find their schema automatically
-- (Each service sets its own search_path via DATABASE_URL or app config)

-- Dashboard activity log table
CREATE TABLE IF NOT EXISTS dashboard_logs.activity (
  id          BIGSERIAL PRIMARY KEY,
  service_id  VARCHAR(64) NOT NULL,
  event       VARCHAR(32) NOT NULL,  -- started | stopped | error | health_check
  detail      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_service_id_idx ON dashboard_logs.activity (service_id);
CREATE INDEX IF NOT EXISTS activity_created_at_idx ON dashboard_logs.activity (created_at DESC);
