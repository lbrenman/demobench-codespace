const express = require('express');
const { getRegistry } = require('../api-registry');
const pool = require('../../db/client');
const router = express.Router();

router.get('/', async (req, res) => {
  const registry = getRegistry();
  const apis = {};

  for (const [name, info] of registry) {
    apis[name] = {
      status: info.status,
      basePath: info.basePath,
      requestCount: info.requestCount,
      errorCount: info.errorCount,
      lastRequest: info.lastRequest
    };
  }

  // Check DB connectivity
  let dbStatus = 'unknown';
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '1.0.0',
    service: 'multi-api-mock-server',
    auth_mode: process.env.AUTH_MODE || 'apikey',
    pagination_mode: process.env.PAGINATION_MODE || 'offset',
    database: dbStatus,
    apis
  });
});

module.exports = router;
