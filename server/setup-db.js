#!/usr/bin/env node
// setup-db.js — Run once to create the database, tables, and seed data
// Usage: node setup-db.js

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setup() {
  // First connect to default postgres db to create our db
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  const dbName = process.env.DB_NAME || 'dgos';

  try {
    await adminClient.connect();
    console.log('Connected to PostgreSQL...');

    // Create database if not exists
    const exists = await adminClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (exists.rows.length === 0) {
      await adminClient.query(`CREATE DATABASE ${dbName}`);
      console.log(`✓ Created database: ${dbName}`);
    } else {
      console.log(`✓ Database already exists: ${dbName}`);
    }
    await adminClient.end();

    // Now connect to dgos and run schema + seed
    const client = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: dbName,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    });
    await client.connect();

    const schema = fs.readFileSync(path.join(__dirname, 'db/schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✓ Phase 1/2 schema created');

    const seed = fs.readFileSync(path.join(__dirname, 'db/seed.sql'), 'utf8');
    await client.query(seed);
    console.log('✓ Phase 1/2 seed data loaded');

    const schema34 = fs.readFileSync(path.join(__dirname, 'db/schema_phase34.sql'), 'utf8');
    await client.query(schema34);
    console.log('✓ Phase 3/4 schema created');

    const seed34 = fs.readFileSync(path.join(__dirname, 'db/seed_phase34.sql'), 'utf8');
    await client.query(seed34);
    console.log('✓ Phase 3/4 seed data loaded');

    const schema5 = fs.readFileSync(path.join(__dirname, 'db/schema_phase5.sql'), 'utf8');
    await client.query(schema5);
    console.log('✓ Phase 5 schema created (Assets, Meetings, Contracts)');

    const seed5 = fs.readFileSync(path.join(__dirname, 'db/seed_phase5.sql'), 'utf8');
    await client.query(seed5);
    console.log('✓ Phase 5 seed data loaded');

    const schema6 = fs.readFileSync(path.join(__dirname, 'db/schema_phase6.sql'), 'utf8');
    await client.query(schema6);
    console.log('✓ Phase 6 schema created (ICT Helpdesk)');

    const seed6 = fs.readFileSync(path.join(__dirname, 'db/seed_phase6.sql'), 'utf8');
    await client.query(seed6);
    console.log('✓ Phase 6 seed data loaded');

    const schema7 = fs.readFileSync(path.join(__dirname, 'db/schema_phase7.sql'), 'utf8');
    await client.query(schema7);
    console.log('✓ Phase 7 schema created (Documents)');

    const seed7 = fs.readFileSync(path.join(__dirname, 'db/seed_phase7.sql'), 'utf8');
    await client.query(seed7);
    console.log('✓ Phase 7 seed data loaded');

    const schema8 = fs.readFileSync(path.join(__dirname, 'db/schema_phase8.sql'), 'utf8');
    await client.query(schema8);
    console.log('✓ Phase 8 schema created (Notifications — no seed needed, computed live)');

    await client.end();
    console.log('\n✅ Database setup complete!\n');
    console.log('Demo accounts:');
    console.log('─────────────────────────────────────────────────');
    console.log('Cabinet Secretary:   cs@tourism.go.ke');
    console.log('Principal Secretary: ps.tourism@tourism.go.ke');
    console.log('ICT Director:        director.ict@tourism.go.ke');
    console.log('ICT Admin (Sysadmin):dennis.kiprop@tourism.go.ke');
    console.log('Staff member:        mary.achieng@tourism.go.ke');
    console.log('─────────────────────────────────────────────────');
    console.log('Password for all:    Password@123');
    console.log('(Staff with must_change_password=TRUE will be prompted to set new password)\n');

  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  }
}

setup();
