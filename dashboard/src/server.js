'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const morgan  = require('morgan');

const servicesRouter  = require('./routes/services');
const containersRouter = require('./routes/containers');
const logsRouter      = require('./routes/logs');
const activityRouter  = require('./routes/activity');

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
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`DemoBench Dashboard running on http://0.0.0.0:${PORT}`);
});

module.exports = app;
