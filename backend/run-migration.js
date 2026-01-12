#!/usr/bin/env node

/**
 * Automated Database Migration Runner
 * Executes pending migrations against Railway PostgreSQL database
 * Uses DATABASE_URL from environment variables
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMigration() {
  log('\n🔧 Railway PostgreSQL Migration Runner', 'cyan');
  log('========================================', 'cyan');
  
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    log('\n❌ Error: DATABASE_URL environment variable not found', 'red');
    log('\nPlease create a .env file in the backend directory with:', 'yellow');
    log('DATABASE_URL=postgresql://postgres:PASSWORD@shortline.proxy.rlwy.net:35335/railway', 'yellow');
    log('\nGet your connection string from Railway Dashboard > Database > Connect', 'yellow');
    process.exit(1);
  }

  log('\n✅ DATABASE_URL found', 'green');
  
  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test connection
    log('\n🔌 Testing database connection...', 'cyan');
    const client = await pool.connect();
    log('✅ Connected to Railway PostgreSQL', 'green');
    
    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    if (migrationFiles.length === 0) {
      log('\n⚠️  No migration files found', 'yellow');
      client.release();
      await pool.end();
      process.exit(0);
    }
    
    log(`\n📁 Found ${migrationFiles.length} migration file(s)`, 'cyan');
    
    let successCount = 0;
    let skipCount = 0;
    
    // Execute each migration
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      log(`\n📄 Processing: ${file}`, 'cyan');
      
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await client.query(migrationSQL);
        log(`✅ ${file} - SUCCESS`, 'green');
        successCount++;
      } catch (error) {
        if (error.code === '42P07' || error.code === '42701') {
          // Table or column already exists
          log(`⏭️  ${file} - SKIPPED (already applied)`, 'yellow');
          skipCount++;
        } else {
          throw error;
        }
      }
    }
    
    log('\n' + '='.repeat(50), 'cyan');
    log('✅ Migration process completed!', 'green');
    log(`\n📊 Summary:`, 'cyan');
    log(`  ✓ Successfully applied: ${successCount}`, 'green');
    log(`  ⏭️  Skipped (existing): ${skipCount}`, 'yellow');
    log(`  📝 Total processed: ${migrationFiles.length}`, 'cyan');
    log('\n🎉 Database schema is now up to date!\n', 'green');
    
    client.release();
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    log('\n❌ Migration failed!', 'red');
    log(`\nError: ${error.message}`, 'red');
    
    if (error.code === 'ECONNREFUSED') {
      log('\nConnection refused. Please check:', 'yellow');
      log('  - DATABASE_URL is correct', 'yellow');
      log('  - Railway database is running', 'yellow');
      log('  - Your internet connection', 'yellow');
    }
    
    await pool.end();
    process.exit(1);
  }
}

// Run migration
runMigration();
