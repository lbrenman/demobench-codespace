'use strict';

const fs   = require('fs');
const path = require('path');

// Inside Docker .env is mounted at /app/.env
// Outside Docker (dev) it lives two levels up from src/
const envPath = fs.existsSync('/app/.env')
  ? '/app/.env'
  : path.join(__dirname, '../../.env');
require('dotenv').config({ path: envPath });

const express = require('express');
const morgan  = require('morgan');

const servicesRouter   = require('./routes/services');
const containersRouter = require('./routes/containers');
const logsRouter       = require('./routes/logs');
const activityRouter   = require('./routes/activity');

const app  = express();
const PORT = process.env.DASHBOARD_PORT || 4500;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json());

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/services',   servicesRouter);
app.use('/api/containers', containersRouter);
app.use('/api/logs',       logsRouter);
app.use('/api/activity',   activityRouter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Serve React SPA ───────────────────────────────────────────────────────────
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  const index = path.join(clientDist, 'index.html');
  if (fs.existsSync(index)) {
    res.sendFile(index);
  } else {
    res.status(503).send('Dashboard client not built. Check container logs.');
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`DemoBench Dashboard running on http://0.0.0.0:${PORT}`);
  console.log(`  .env loaded from: ${envPath}`);
  console.log(`  client/dist: ${fs.existsSync(clientDist) ? 'found' : 'NOT FOUND'}`);
});

module.exports = app;
