#!/usr/bin/env node

/**
 * Migration script — applies schema.sql to the database.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./client');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  try {
    console.log('Running database migration...');
    await pool.query(sql);
    console.log('✅ Migration complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
