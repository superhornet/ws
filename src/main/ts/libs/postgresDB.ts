import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config({quiet: true});

// Validate required env vars
const requiredEnv = ['POSTGRES_HOST', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DATABASE', 'POSTGRES_PORT'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE,
  port: Number(process.env.POSTGRES_PORT),
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
