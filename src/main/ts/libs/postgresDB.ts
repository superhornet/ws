import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { AUDIT_DDL, FRONTEND_FIELDS_DDL, IDEMPOTENCY_KEYS_DDL, OTP_REQUESTS_DDL, RECURRING_DEPOSITS_DDL, SESSIONS_USER_BINDING_DDL } from './schema.ts';

// Managed hosts like Render expose a single `DATABASE_URL` connection string
// (their Blueprint `fromDatabase` only surfaces connectionString, not discrete
// host/port). When present it fully describes the connection. Otherwise fall
// back to the discrete POSTGRES_* vars used by local dev and docker-compose.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  const requiredEnv = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DATABASE', 'POSTGRES_PORT'];
  for (const key of requiredEnv) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key} (or set DATABASE_URL)`);
    }
  }
}

// Managed Postgres providers (Render, Railway, Supabase, RDS, etc.) generally
// require TLS. Enable it with POSTGRES_SSL=true. Many providers present a cert
// that isn't in Node's default CA store, so rejectUnauthorized defaults to
// false; set POSTGRES_SSL_REJECT_UNAUTHORIZED=true once you supply a proper CA.
const sslEnabled = process.env.POSTGRES_SSL === 'true';
const sslConfig = sslEnabled
  ? { rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED === 'true' }
  : undefined;

const connectionConfig = connectionString
  ? { connectionString }
  : {
      host: process.env.POSTGRES_HOST,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DATABASE,
      port: Number(process.env.POSTGRES_PORT),
    };

const pool = new Pool({
  ...connectionConfig,
  max: Number(process.env.POSTGRES_MAX) || 10,
  idleTimeoutMillis: Number(process.env.POSTGRES_IDLETIMEOUT) || 30000,
  connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECTIONTIMEOUT) || 2000,
  ssl: sslConfig,
});

  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err);
    process.exit(1);
  }


// Simple query helper
export const query = async <T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<T[]> => {
  try {
    const res = await pool.query<T>(text, params);
    return res.rows;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
};

// Transaction helper
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Transaction rolled back due to error:', err);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Idempotent startup migrator. Brings an existing database up to the schema the
 * running code expects (adds `users.phone_e164`, ensures the audit /
 * idempotency / OTP tables exist). Safe to run on every boot; `init.sql` remains
 * the canonical bootstrap for a brand-new database.
 */
export const ensureDatabaseSchema = async (): Promise<void> => {
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) THEN
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_e164 TEXT;
      END IF;
    END $$;

    ${AUDIT_DDL}

    ${IDEMPOTENCY_KEYS_DDL}

    ${OTP_REQUESTS_DDL}

    ALTER TABLE otp_requests ADD COLUMN IF NOT EXISTS phone_e164 TEXT;

    ${FRONTEND_FIELDS_DDL}

    ${RECURRING_DEPOSITS_DDL}

    ${SESSIONS_USER_BINDING_DDL}
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone_e164'
      ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_e164
          ON users(phone_e164)
          WHERE phone_e164 IS NOT NULL AND deleted = FALSE;
      END IF;
    END $$;
  `);
};

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n🔻 Received ${signal}, closing PostgreSQL pool...`);
  try {
    await pool.end();
    console.log('✅ PostgreSQL pool closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error closing PostgreSQL pool:', err);
    process.exit(1);
  }
};

['SIGINT', 'SIGTERM', 'beforeExit'].forEach((event) => {
  process.on(event as NodeJS.Signals, () => shutdown(event));
});

export default pool;
