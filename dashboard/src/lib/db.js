'use strict';

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (pool) return pool;
  pool = new Pool({
    host:     process.env.POSTGRES_HOST     || 'postgres',
    port:     parseInt(process.env.POSTGRES_PORT || '5432'),
    user:     process.env.POSTGRES_USER     || 'demobench',
    password: process.env.POSTGRES_PASSWORD || 'demobench_pass',
    database: process.env.POSTGRES_DB       || 'demobench',
    // Don't crash the dashboard if postgres isn't up yet
    connectionTimeoutMillis: 3000,
  });
  pool.on('error', (err) => {
    console.warn('[db] Pool error (non-fatal):', err.message);
  });
  return pool;
}

/**
 * Logs a service lifecycle event. Silently fails if DB is unavailable.
 */
async function logActivity(serviceId, event, detail = null) {
  try {
    await getPool().query(
      `INSERT INTO dashboard_logs.activity (service_id, event, detail)
       VALUES ($1, $2, $3)`,
      [serviceId, event, detail]
    );
  } catch (err) {
    // Non-fatal — dashboard still works without DB
    console.warn(`[db] Failed to log activity for ${serviceId}:`, err.message);
  }
}

/**
 * Returns recent activity entries for a service (or all services).
 */
async function getActivity({ serviceId = null, limit = 50 } = {}) {
  try {
    const where  = serviceId ? 'WHERE service_id = $1' : '';
    const params = serviceId ? [serviceId, limit]       : [limit];
    const query  = `
      SELECT id, service_id, event, detail, created_at
      FROM dashboard_logs.activity
      ${where}
      ORDER BY created_at DESC
      LIMIT ${serviceId ? '$2' : '$1'}
    `;
    const { rows } = await getPool().query(query, params);
    return rows;
  } catch (err) {
    console.warn('[db] Failed to fetch activity:', err.message);
    return [];
  }
}

module.exports = { logActivity, getActivity };
