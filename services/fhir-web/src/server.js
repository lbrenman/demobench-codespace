require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Expose FHIR connection config to the browser — no secrets beyond what's needed
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({
    baseUrl: process.env.FHIR_API_BASE_URL || 'http://localhost:3000',
    apiKey:  process.env.FHIR_API_KEY  || ''
  });
});

// Serve the static web app
app.use(express.static(path.join(__dirname, '../public')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`FHIR R4 Web App  →  http://localhost:${PORT}`);
  console.log(`  API target: ${process.env.FHIR_API_BASE_URL || 'http://localhost:3000'}`);
});
