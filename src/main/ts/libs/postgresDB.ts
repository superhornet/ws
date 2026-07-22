import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { getPostgresConnectionConfig } from './postgresConfig.ts';
import { AUDIT_DDL, FRONTEND_FIELDS_DDL, IDEMPOTENCY_KEYS_DDL, OTP_REQUESTS_DDL, RECURRING_DEPOSITS_DDL, SESSIONS_USER_BINDING_DDL } from './schema.ts';

const pool = new Pool({
    ...getPostgresConnectionConfig(),
    max: Number(process.env.POSTGRES_MAX) || 10,
    idleTimeoutMillis: Number(process.env.POSTGRES_IDLETIMEOUT) || 30000,
    connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECTIONTIMEOUT) || 2000,
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
        ALTER TABLE users ADD COLUMN IF NOT EXISTS cybrid_customer_guid TEXT;
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
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'cybrid_customer_guid'
      ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cybrid_customer_guid
          ON users(cybrid_customer_guid)
          WHERE cybrid_customer_guid IS NOT NULL;
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
