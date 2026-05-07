'use strict';

const fs   = require('fs');
const path = require('path');

const SERVICES_ROOT = path.join(__dirname, '../../../services');

let _cache = null;

/**
 * Reads all services/*/service.json files and returns them as an array.
 * Results are cached in memory. Call loadServices(true) to force a reload.
 */
function loadServices(forceReload = false) {
  if (_cache && !forceReload) return _cache;

  const services = [];

  if (!fs.existsSync(SERVICES_ROOT)) {
    console.warn(`[manifest] Services root not found: ${SERVICES_ROOT}`);
    return [];
  }

  const dirs = fs.readdirSync(SERVICES_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const dir of dirs) {
    const manifestPath = path.join(SERVICES_ROOT, dir, 'service.json');
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const raw  = fs.readFileSync(manifestPath, 'utf8');
      const data = JSON.parse(raw);
      services.push(data);
    } catch (err) {
      console.error(`[manifest] Failed to parse ${manifestPath}:`, err.message);
    }
  }

  // Sort by category then name for consistent dashboard ordering
  services.sort((a, b) => {
    const catCmp = (a.category || '').localeCompare(b.category || '');
    return catCmp !== 0 ? catCmp : (a.name || '').localeCompare(b.name || '');
  });

  _cache = services;
  return services;
}

/**
 * Returns a single service manifest by id, or null if not found.
 */
function getService(id) {
  return loadServices().find(s => s.id === id) || null;
}

module.exports = { loadServices, getService };
