#!/usr/bin/env node

/**
 * Master Seed Script — discovers and runs all API plugin seeds.
 *
 * Usage:
 *   node src/db/seed.js          # Seed all APIs (ON CONFLICT DO NOTHING)
 *   node src/db/seed.js --clear  # Truncate all tables first, then seed
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./client');

const APIS_DIR = path.join(__dirname, '../apis');
const clearMode = process.argv.includes('--clear');

async function seedAll() {
  const client = await pool.connect();

  try {
    // First apply schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
    await client.query(schemaSql);
    console.log('✅ Schema applied.');

    // Seed OAuth clients
    await seedOAuthClients(client);

    // Discover API plugin seeds
    const dirs = fs.readdirSync(APIS_DIR)
      .filter(name => fs.statSync(path.join(APIS_DIR, name)).isDirectory());

    // Sort to ensure contacts seeds before orders (foreign key dependency)
    const ordered = ['contacts', 'products', 'orders'].filter(d => dirs.includes(d));
    const remaining = dirs.filter(d => !ordered.includes(d));
    const allDirs = [...ordered, ...remaining];

    if (clearMode) {
      console.log('🗑️  Clearing all tables...');
      // Reverse order for foreign key constraints
      for (const dir of [...allDirs].reverse()) {
        const configPath = path.join(APIS_DIR, dir, 'api.config.json');
        if (fs.existsSync(configPath)) {
          const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          try {
            await client.query(`TRUNCATE TABLE ${config.resource} CASCADE`);
            console.log(`   Truncated ${config.resource}`);
          } catch (e) {
            // Table might not exist yet
          }
        }
      }
      try {
        await client.query('TRUNCATE TABLE order_items CASCADE');
        console.log('   Truncated order_items');
      } catch (e) { /* table might not exist */ }
      try {
        await client.query('TRUNCATE TABLE oauth_clients CASCADE');
        console.log('   Truncated oauth_clients');
      } catch (e) { /* table might not exist */ }
      // Re-seed OAuth clients after clear
      await seedOAuthClients(client);
    }

    for (const dir of allDirs) {
      const seedPath = path.join(APIS_DIR, dir, 'data', 'seed.js');
      try {
        const seedFn = require(seedPath);
        console.log(`\n📦 Seeding ${dir}...`);
        await seedFn(client);
      } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
          console.log(`   ⚠️  No seed file for ${dir}, skipping.`);
        } else {
          throw e;
        }
      }
    }

    console.log('\n✅ All seeds complete.');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

async function seedOAuthClients(client) {
  const bcrypt = require('bcryptjs');
  const hashedSecret = await bcrypt.hash('mock-client-secret', 10);

  await client.query(`
    INSERT INTO oauth_clients (client_id, client_secret, client_name, scopes)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (client_id) DO NOTHING
  `, ['mock-client-id', hashedSecret, 'Default Mock Client', '*']);

  console.log('✅ OAuth clients seeded (client_id: mock-client-id, secret: mock-client-secret)');
}

seedAll();
