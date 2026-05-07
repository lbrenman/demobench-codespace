const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || '4.0.1',
    service: 'fhir-r4-api',
    fhirVersion: 'R4',
    dataMode: process.env.DATA_MODE || 'mock',
    authMode: process.env.AUTH_MODE || 'apikey'
  });
});

module.exports = router;
