import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

// Import SQL migration files
import migration0001 from './migrations/0001_create_app_state';
import migration0002 from './migrations/0002_create_user_profiles';
import migration0003 from './migrations/0003_create_social_links';
import migration0004 from './migrations/0004_create_scan_history';

// Database configuration
const DATABASE_NAME = 'antler.db';

// Open SQLite database
const expoDb = SQLite.openDatabaseSync(DATABASE_NAME);

// Create Drizzle instance
export const db = drizzle(expoDb, { schema });

// Migration tracking table
const MIGRATIONS_TABLE = '_migrations';

/**
 * Check if a table exists in the database
 */
function tableExists(tableName: string): boolean {
  try {
    const result = expoDb.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    return (result?.count ?? 0) > 0;
  } catch (error) {
    console.error(`Error checking if table exists: ${tableName}`, error);
    return false;
  }
}

/**
 * Check if a migration has been applied
 */
function isMigrationApplied(name: string): boolean {
  try {
    const result = expoDb.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${MIGRATIONS_TABLE} WHERE name = ?`,
      [name]
    );
    return (result?.count ?? 0) > 0;
  } catch (error) {
    // If the migrations table doesn't exist yet, the migration hasn't been applied
    // This handles the first-run case where the table hasn't been created
    return false;
  }
}

/**
 * Mark a migration as applied
 */
function markMigrationApplied(name: string): void {
  expoDb.runSync(
    `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`,
    [name]
  );
}

/**
 * Map migration names to their expected table names
 */
const MIGRATION_TABLE_MAP: Record<string, string> = {
  '0001_create_app_state': 'app_state',
  '0002_create_user_profiles': 'user_profiles',
  '0003_create_social_links': 'social_links',
  '0004_create_scan_history': 'scan_history',
};

/**
 * Execute a SQL migration file
 */
function executeMigration(name: string, sql: string): void {
  try {
    // Begin transaction for atomicity
    expoDb.execSync('BEGIN TRANSACTION');

    // Remove SQL comment lines (lines starting with --) before processing
    const sqlWithoutComments = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split by semicolons and execute each statement
    const statements = sqlWithoutComments
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        if (s.length === 0) return false;
        if (s.startsWith('/*') && s.endsWith('*/')) return false;
        return true;
      });

    for (const statement of statements) {
      expoDb.execSync(statement);
    }

    // Verify the expected table was created before marking as applied
    const expectedTable = MIGRATION_TABLE_MAP[name];
    if (expectedTable && !tableExists(expectedTable)) {
      throw new Error(`Migration ${name} completed but expected table '${expectedTable}' does not exist`);
    }

    markMigrationApplied(name);

    // Commit transaction
    expoDb.execSync('COMMIT');
  } catch (error) {
    // Rollback on failure
    expoDb.execSync('ROLLBACK');
    console.error(`Migration failed: ${name}`, error);
    throw error;
  }
}

/**
 * Initialize the database (run migrations)
 */
export function initializeDatabase(): void {
  try {
    if (__DEV__) { console.log('Initializing database...'); }

    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );
    `);

    // Define migrations in order
    const migrations = [
      { name: '0001_create_app_state', sql: migration0001 },
      { name: '0002_create_user_profiles', sql: migration0002 },
      { name: '0003_create_social_links', sql: migration0003 },
      { name: '0004_create_scan_history', sql: migration0004 },
    ];

    // Execute each migration if not already applied
    for (const migration of migrations) {
      const applied = isMigrationApplied(migration.name);
      if (!applied) {
        executeMigration(migration.name, migration.sql);
      } 
      // else {
      //   console.log(`Migration already applied: ${migration.name}`);
      // }
    }

    if (__DEV__) { console.log('All migrations completed successfully'); }
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}
