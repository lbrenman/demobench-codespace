const express = require('express');
const { getRegistry, getRequestLog } = require('../api-registry');
const pool = require('../../db/client');
const { execSync } = require('child_process');
const path = require('path');
const router = express.Router();

/**
 * GET /admin — Serve the admin portal SPA
 */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/admin.html'));
});

/**
 * GET /admin/api/overview — Server overview data
 */
router.get('/api/overview', async (req, res) => {
  const registry = getRegistry();
  const apis = [];

  for (const [name, info] of registry) {
    apis.push(info);
  }

  let dbStatus = 'unknown';
  let dbInfo = {};
  try {
    const result = await pool.query('SELECT version() as version');
    dbStatus = 'connected';
    dbInfo.version = result.rows[0].version;
  } catch {
    dbStatus = 'disconnected';
  }

  res.json({
    server: {
      status: 'running',
      uptime: process.uptime(),
      version: process.env.API_VERSION || '1.0.0',
      nodeVersion: process.version,
      authMode: process.env.AUTH_MODE || 'apikey',
      paginationMode: process.env.PAGINATION_MODE || 'offset',
      errorSimulation: {
        rate500: parseFloat(process.env.ERROR_RATE_500 || '0'),
        rate429: parseFloat(process.env.ERROR_RATE_429 || '0'),
        rateTimeout: parseFloat(process.env.ERROR_RATE_TIMEOUT || '0')
      }
    },
    database: {
      status: dbStatus,
      ...dbInfo
    },
    apis
  });
});

/**
 * GET /admin/api/logs — Recent request log
 */
router.get('/api/logs', (req, res) => {
  const apiName = req.query.api || null;
  const limit = parseInt(req.query.limit || '100', 10);
  const logs = getRequestLog(apiName).slice(-limit);
  res.json({ data: logs, total: logs.length });
});

/**
 * GET /admin/api/containers — Docker container info
 */
router.get('/api/containers', (req, res) => {
  try {
    const output = execSync(
      'docker ps --format "{{.ID}}\\t{{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}"',
      { encoding: 'utf-8', timeout: 5000 }
    );

    const containers = output.trim().split('\n').filter(Boolean).map(line => {
      const [id, name, image, status, ports] = line.split('\t');
      return { id, name, image, status, ports };
    });

    res.json({ data: containers });
  } catch (err) {
    res.json({ data: [], error: 'Docker not available or no containers running' });
  }
});

/**
 * GET /admin/api/containers/:name/logs — Container logs
 */
router.get('/api/containers/:name/logs', (req, res) => {
  try {
    const tail = req.query.tail || '100';
    const output = execSync(
      `docker logs --tail ${tail} ${req.params.name}`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    res.json({ data: output });
  } catch (err) {
    res.status(404).json({ error: `Container "${req.params.name}" not found or Docker not available` });
  }
});

module.exports = router;
