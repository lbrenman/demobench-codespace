/**
 * Generic FHIR R4 controller factory.
 * Works in both mock (in-memory JSON) and postgres modes.
 * Each resource is stored as a JSONB column in postgres, preserving full FHIR structure.
 */
const { v4: uuidv4 } = require('uuid');
const { buildPaginationMeta } = require('../middleware/pagination');

function getDataMode() {
  return (process.env.DATA_MODE || 'mock').toLowerCase();
}

// ─── Mock store (shared across all instances in the process) ───
const mockStores = {};

function getMockStore(resourceType, initialData) {
  if (!mockStores[resourceType]) {
    mockStores[resourceType] = initialData.map(r => ({
      ...r,
      id: r.id || uuidv4(),
      resourceType
    }));
  }
  return mockStores[resourceType];
}

// ─── Postgres helpers ───
let _pool = null;
function getPool() {
  if (!_pool) {
    const { Pool } = require('pg');
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

async function pgList(resourceType, offset, limit) {
  const pool = getPool();
  const countRes = await pool.query(
    'SELECT COUNT(*) FROM fhir_resources WHERE resource_type = $1',
    [resourceType]
  );
  const total = parseInt(countRes.rows[0].count);
  const dataRes = await pool.query(
    'SELECT resource FROM fhir_resources WHERE resource_type = $1 ORDER BY created_at DESC OFFSET $2 LIMIT $3',
    [resourceType, offset, limit]
  );
  return { total, items: dataRes.rows.map(r => r.resource) };
}

async function pgGetById(resourceType, id) {
  const pool = getPool();
  const res = await pool.query(
    'SELECT resource FROM fhir_resources WHERE resource_type = $1 AND resource_id = $2',
    [resourceType, id]
  );
  return res.rows[0] ? res.rows[0].resource : null;
}

async function pgCreate(resourceType, resource) {
  const pool = getPool();
  const id = resource.id || uuidv4();
  const r = { ...resource, id, resourceType };
  await pool.query(
    `INSERT INTO fhir_resources (resource_id, resource_type, resource)
     VALUES ($1, $2, $3)
     ON CONFLICT (resource_id, resource_type) DO UPDATE SET resource = $3, updated_at = NOW()`,
    [id, resourceType, r]
  );
  return r;
}

async function pgUpdate(resourceType, id, updates) {
  const pool = getPool();
  const existing = await pgGetById(resourceType, id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, id, resourceType };
  await pool.query(
    'UPDATE fhir_resources SET resource = $1, updated_at = NOW() WHERE resource_type = $2 AND resource_id = $3',
    [updated, resourceType, id]
  );
  return updated;
}

async function pgDelete(resourceType, id) {
  const pool = getPool();
  const res = await pool.query(
    'DELETE FROM fhir_resources WHERE resource_type = $1 AND resource_id = $2 RETURNING resource_id',
    [resourceType, id]
  );
  return res.rowCount > 0;
}

// ─── Controller factory ───
function createController(resourceType, initialData) {
  return {
    async list(req, res) {
      try {
        const { page, limit, offset } = req.pagination;
        let total, items;

        if (getDataMode() === 'postgres') {
          ({ total, items } = await pgList(resourceType, offset, limit));
        } else {
          const store = getMockStore(resourceType, initialData);
          total = store.length;
          items = store.slice(offset, offset + limit);
        }

        res.json({
          resourceType: 'Bundle',
          type: 'searchset',
          total,
          pagination: buildPaginationMeta(total, page, limit),
          entry: items.map(r => ({ resource: r }))
        });
      } catch (err) {
        console.error(`[${resourceType}] list error:`, err);
        res.status(500).json({ error: 'Internal server error' });
      }
    },

    async getById(req, res) {
      try {
        const { id } = req.params;
        let resource;

        if (getDataMode() === 'postgres') {
          resource = await pgGetById(resourceType, id);
        } else {
          const store = getMockStore(resourceType, initialData);
          resource = store.find(r => r.id === id);
        }

        if (!resource) {
          return res.status(404).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'not-found', diagnostics: `${resourceType}/${id} not found` }]
          });
        }
        res.json(resource);
      } catch (err) {
        console.error(`[${resourceType}] getById error:`, err);
        res.status(500).json({ error: 'Internal server error' });
      }
    },

    async create(req, res) {
      try {
        const body = req.body;
        if (!body || typeof body !== 'object') {
          return res.status(400).json({ error: 'Request body must be a JSON object' });
        }
        let resource;

        if (getDataMode() === 'postgres') {
          resource = await pgCreate(resourceType, body);
        } else {
          const store = getMockStore(resourceType, initialData);
          resource = { ...body, id: body.id || uuidv4(), resourceType };
          store.push(resource);
        }
        res.status(201).json(resource);
      } catch (err) {
        console.error(`[${resourceType}] create error:`, err);
        res.status(500).json({ error: 'Internal server error' });
      }
    },

    async update(req, res) {
      try {
        const { id } = req.params;
        const body = req.body;
        if (!body || typeof body !== 'object') {
          return res.status(400).json({ error: 'Request body must be a JSON object' });
        }
        let resource;

        if (getDataMode() === 'postgres') {
          resource = await pgUpdate(resourceType, id, body);
        } else {
          const store = getMockStore(resourceType, initialData);
          const idx = store.findIndex(r => r.id === id);
          if (idx === -1) resource = null;
          else {
            store[idx] = { ...store[idx], ...body, id, resourceType };
            resource = store[idx];
          }
        }

        if (!resource) {
          return res.status(404).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'not-found', diagnostics: `${resourceType}/${id} not found` }]
          });
        }
        res.json(resource);
      } catch (err) {
        console.error(`[${resourceType}] update error:`, err);
        res.status(500).json({ error: 'Internal server error' });
      }
    },

    async remove(req, res) {
      try {
        const { id } = req.params;
        let deleted;

        if (getDataMode() === 'postgres') {
          deleted = await pgDelete(resourceType, id);
        } else {
          const store = getMockStore(resourceType, initialData);
          const idx = store.findIndex(r => r.id === id);
          if (idx === -1) deleted = false;
          else { store.splice(idx, 1); deleted = true; }
        }

        if (!deleted) {
          return res.status(404).json({
            resourceType: 'OperationOutcome',
            issue: [{ severity: 'error', code: 'not-found', diagnostics: `${resourceType}/${id} not found` }]
          });
        }
        res.status(204).send();
      } catch (err) {
        console.error(`[${resourceType}] delete error:`, err);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

module.exports = { createController };
