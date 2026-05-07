'use strict';

const express = require('express');
const router  = express.Router();
const { listContainers } = require('../lib/docker');

// GET /api/containers
router.get('/', async (_req, res) => {
  try {
    const containers = await listContainers();
    res.json(Object.values(containers));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
