import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const db = new Database('database.sqlite');
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function migrateTable(tableName: string, sqliteQuery: string = `SELECT * FROM ${tableName}`) {
  console.log(`Migrating table: ${tableName}...`);
  const items = db.prepare(sqliteQuery).all();
  
  if (items.length === 0) {
    console.log(`No data found in ${tableName} to migrate.`);
    return;
  }

  // Remove potential ID conflicts or let Supabase handle if they are increments
  // Actually, for a one-time migration, we usually want to KEEP the IDs to maintain relations.
  
  const { error } = await supabase.from(tableName).upsert(items);
  
  if (error) {
    console.error(`Error migrating ${tableName}:`, error.message);
  } else {
    console.log(`Successfully migrated ${items.length} items to ${tableName}.`);
  }
}

async function runMigration() {
  console.log('Starting migration from SQLite to Supabase...');
  
  try {
    // Migrate core data first (order matters for foreign keys if any)
    await migrateTable('users');
    await migrateTable('plans');
    await migrateTable('services');
    await migrateTable('page_content');
    
    // Migrate customer and inventory data
    await migrateTable('inventory');
    await migrateTable('customers');
    await migrateTable('plan_clicks');
    
    console.log('Migration finished successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  }
}

runMigration();
