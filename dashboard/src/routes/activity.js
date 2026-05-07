'use strict';

const express = require('express');
const router  = express.Router();
const { getActivity } = require('../lib/db');

// GET /api/activity?limit=50
router.get('/', async (req, res) => {
  const limit = parseInt(req.query.limit || '50');
  const rows  = await getActivity({ limit });
  res.json(rows);
});

// GET /api/activity/:serviceId?limit=50
router.get('/:serviceId', async (req, res) => {
  const limit = parseInt(req.query.limit || '50');
  const rows  = await getActivity({ serviceId: req.params.serviceId, limit });
  res.json(rows);
});

module.exports = router;
