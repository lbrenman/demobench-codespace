#!/usr/bin/env node
'use strict';

/**
 * scripts/generate-docs.js
 *
 * Reads all services/*/service.json manifests and regenerates the
 * service table section of README.md.
 *
 * Usage:  npm run docs   (from repo root)
 *         node scripts/generate-docs.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT          = path.join(__dirname, '..');
const SERVICES_ROOT = path.join(ROOT, 'services');
const README_PATH   = path.join(ROOT, 'README.md');

const START_MARKER = '<!-- SERVICE_TABLE_START -->';
const END_MARKER   = '<!-- SERVICE_TABLE_END -->';

// Load all manifests
const services = [];
for (const dir of fs.readdirSync(SERVICES_ROOT)) {
  const manifestPath = path.join(SERVICES_ROOT, dir, 'service.json');
  if (!fs.existsSync(manifestPath)) continue;
  try {
    services.push(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
  } catch (e) {
    console.warn(`Skipping ${dir}: ${e.message}`);
  }
}

// Sort by category then name
services.sort((a, b) => {
  const c = (a.category || '').localeCompare(b.category || '');
  return c !== 0 ? c : (a.name || '').localeCompare(b.name || '');
});

// Build markdown table
const rows = services.map(s => {
  const port     = s.port    ? `\`${s.port}\``  : '—';
  const profile  = s.profile ? `\`${s.profile}\`` : '—';
  const secrets  = s.requiredSecrets?.length ? s.requiredSecrets.map(k => `\`${k}\``).join(', ') : '—';
  const deps     = s.dependsOn?.length ? s.dependsOn.join(', ') : '—';
  const docs     = s.docsUrl ? `[source](${s.docsUrl})` : '—';
  return `| **${s.name}** | \`${s.id}\` | ${s.category} | ${profile} | ${port} | ${secrets} | ${deps} | ${docs} |`;
});

const table = [
  '| Service | ID | Category | Profile | Port | Required Secrets | Depends On | Source |',
  '|---------|-----|----------|---------|------|-----------------|------------|--------|',
  ...rows,
].join('\n');

const newSection = `${START_MARKER}\n${table}\n${END_MARKER}`;

// Update README
const readme = fs.readFileSync(README_PATH, 'utf8');
const startIdx = readme.indexOf(START_MARKER);
const endIdx   = readme.indexOf(END_MARKER);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find SERVICE_TABLE_START / SERVICE_TABLE_END markers in README.md');
  process.exit(1);
}

const updated = readme.slice(0, startIdx) + newSection + readme.slice(endIdx + END_MARKER.length);
fs.writeFileSync(README_PATH, updated);

console.log(`✅ README service table updated with ${services.length} services.`);
