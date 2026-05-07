/**
 * API Loader — scans the apis/ directory for plugin folders.
 *
 * Each plugin folder must contain:
 *   - api.config.json   — metadata (name, basePath, resource, description, version)
 *   - routes/index.js   — Express router
 *   - controllers/index.js — CRUD controller
 *   - data/<resource>.json — seed data
 *
 * The loader auto-mounts each plugin's routes at /api/<basePath>.
 */

const fs = require('fs');
const path = require('path');
const { registerApi } = require('./api-registry');

const APIS_DIR = path.join(__dirname, '../apis');

function loadApis(app) {
  if (!fs.existsSync(APIS_DIR)) {
    console.warn('⚠️  No apis/ directory found. No APIs loaded.');
    return;
  }

  const dirs = fs.readdirSync(APIS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  console.log(`\n📦 Discovering API plugins in apis/...`);

  for (const dir of dirs) {
    const configPath = path.join(APIS_DIR, dir, 'api.config.json');

    if (!fs.existsSync(configPath)) {
      console.warn(`   ⚠️  Skipping ${dir}/ — no api.config.json found`);
      continue;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const routerPath = path.join(APIS_DIR, dir, 'routes', 'index.js');

      if (!fs.existsSync(routerPath)) {
        console.warn(`   ⚠️  Skipping ${dir}/ — no routes/index.js found`);
        continue;
      }

      const router = require(routerPath);
      const mountPath = `/api/${config.basePath}`;

      app.use(mountPath, router);
      registerApi(config.name, config);

      console.log(`   ✅ ${config.name} → ${mountPath}`);
      console.log(`      ${config.description}`);
    } catch (err) {
      console.error(`   ❌ Error loading ${dir}/: ${err.message}`);
    }
  }

  console.log('');
}

module.exports = { loadApis };
