-- FHIR R4 resource store
-- All FHIR resources stored as JSONB, preserving full FHIR structure.

CREATE TABLE IF NOT EXISTS fhir_resources (
  id           BIGSERIAL PRIMARY KEY,
  resource_id  VARCHAR(64)  NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource     JSONB        NOT NULL,
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (resource_id, resource_type)
);

CREATE INDEX IF NOT EXISTS idx_fhir_resources_type      ON fhir_resources (resource_type);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_type_id   ON fhir_resources (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_resource   ON fhir_resources USING gin (resource);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_created   ON fhir_resources (created_at DESC);
