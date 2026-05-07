'use strict';

const express  = require('express');
const router   = express.Router();
const { loadServices }               = require('../lib/manifest');
const { listContainers, composeCommand } = require('../lib/docker');
const { checkAllServices }           = require('../lib/health');
const { logActivity }                = require('../lib/db');
const fs = require('fs');
const path = require('path');

// GET /api/services
// Returns all service manifests enriched with container state and health
router.get('/', async (_req, res) => {
  try {
    const services    = loadServices();
    const containers  = await listContainers();
    const health      = await checkAllServices(services);

    // Read current .env to check for missing required secrets
    const envPath = path.join(__dirname, '../../../../.env');
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const envKeys = new Set(
      envContent.split('\n')
        .filter(l => !l.startsWith('#') && l.includes('='))
        .map(l => l.split('=')[0].trim())
        .filter(k => {
          const val = envContent.match(new RegExp(`^${k}=(.*)`, 'm'));
          return val && val[1] && val[1].trim() !== '';
        })
    );

    const enriched = services.map(svc => {
      // Match container by compose service name
      const containerName = svc.composeService || svc.id;
      // Docker Compose names containers as <project>-<service>-<index>
      const container = Object.values(containers).find(c =>
        c.name === containerName ||
        c.name.endsWith(`-${containerName}-1`) ||
        c.name.endsWith(`_${containerName}_1`)
      );

      const missingSecrets = (svc.requiredSecrets || []).filter(k => !envKeys.has(k));

      return {
        ...svc,
        container: container ? {
          id:      container.id,
          state:   container.state,
          status:  container.status,
          created: container.created,
        } : null,
        health: health[svc.id] || null,
        missingSecrets,
      };
    });

    res.json(enriched);
  } catch (err) {
    console.error('[/api/services]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/services/:id/start
router.post('/:id/start', async (req, res) => {
  const { id } = req.params;
  const svc = loadServices().find(s => s.id === id);
  if (!svc) return res.status(404).json({ error: 'Service not found' });

  try {
    const result = await composeCommand([
      '--profile', svc.profile,
      'up', '-d', '--no-deps',
      svc.composeService || id
    ]);
    await logActivity(id, 'started', result.stdout || result.stderr);
    res.json({ ok: true, ...result });
  } catch (err) {
    await logActivity(id, 'error', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/services/:id/stop
router.post('/:id/stop', async (req, res) => {
  const { id } = req.params;
  const svc = loadServices().find(s => s.id === id);
  if (!svc) return res.status(404).json({ error: 'Service not found' });

  try {
    const result = await composeCommand(['stop', svc.composeService || id]);
    await logActivity(id, 'stopped', result.stdout || result.stderr);
    res.json({ ok: true, ...result });
  } catch (err) {
    await logActivity(id, 'error', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/services/:id/restart
router.post('/:id/restart', async (req, res) => {
  const { id } = req.params;
  const svc = loadServices().find(s => s.id === id);
  if (!svc) return res.status(404).json({ error: 'Service not found' });

  try {
    const result = await composeCommand(['restart', svc.composeService || id]);
    await logActivity(id, 'restarted', result.stdout || result.stderr);
    res.json({ ok: true, ...result });
  } catch (err) {
    await logActivity(id, 'error', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/services/reload-manifests
router.post('/reload-manifests', (_req, res) => {
  const services = loadServices(true); // force reload
  res.json({ reloaded: true, count: services.length });
});

module.exports = router;
