/**
 * Canonical DDL fragments shared between the runtime migrator
 * (`ensureDatabaseSchema`) and the `/reset` dev route, so a table definition
 * lives in exactly one place rather than being duplicated across TypeScript
 * sources.
 *
 * `init.sql` intentionally keeps its own copy: it is the raw bootstrap script
 * used to provision a brand-new database (e.g. via Docker) and cannot import
 * this module.
 *
 * All statements are written idempotently (`IF NOT EXISTS`) so they are safe to
 * run on both a fresh database and an existing one.
 */
export const AUDIT_DDL = `
  CREATE TABLE IF NOT EXISTS audit(
    id SERIAL PRIMARY KEY,
    deleted BOOLEAN DEFAULT FALSE,
    message TEXT NOT NULL,
    session UUID NOT NULL,
    time_at TIMESTAMP NOT NULL DEFAULT (NOW()),
    type TEXT
  );
`;

export const IDEMPOTENCY_KEYS_DDL = `
  CREATE TABLE IF NOT EXISTS idempotency_keys(
    id SERIAL PRIMARY KEY,
    idempotency_key TEXT NOT NULL CHECK(length(idempotency_key) >= 1 AND length(idempotency_key) <= 255),
    session_id TEXT NOT NULL CHECK(length(session_id) = 36),
    route_path TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('in_progress', 'completed')) DEFAULT 'in_progress',
    response_code INTEGER,
    response_body JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT (NOW()),
    completed_at TIMESTAMP,
    UNIQUE(session_id, idempotency_key, route_path)
  );
  CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created ON idempotency_keys(created_at);
`;

export const OTP_REQUESTS_DDL = `
  CREATE TABLE IF NOT EXISTS otp_requests(
    otp_request_id UUID PRIMARY KEY,
    channel TEXT NOT NULL CHECK(channel IN ('phone', 'email')),
    destination_hash TEXT NOT NULL CHECK(length(destination_hash) = 64),
    purpose TEXT NOT NULL CHECK(purpose IN ('login', 'signup', 'recovery_email')),
    session_uuid UUID,
    phone_e164 TEXT,
    otp_hash TEXT NOT NULL CHECK(length(otp_hash) = 64),
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP DEFAULT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    resend_available_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT (NOW()),
    updated_at TIMESTAMP NOT NULL DEFAULT (NOW())
  );
  CREATE INDEX IF NOT EXISTS idx_otp_requests_lookup ON otp_requests(channel, destination_hash, purpose, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_otp_requests_session ON otp_requests(session_uuid);
`;

/**
 * Scheduled, recurring transfers into a substack. Amounts are stored in cents.
 * `to_identifier` references a substack; `from_identifier` is left unconstrained
 * so a funding source can be a substack or an external account identifier.
 */
export const RECURRING_DEPOSITS_DDL = `
  CREATE TABLE IF NOT EXISTS recurring_deposits(
    id SERIAL PRIMARY KEY,
    recurring_deposit_identifier UUID DEFAULT uuidv7(),
    deleted BOOLEAN DEFAULT FALSE,
    from_identifier UUID NOT NULL,
    to_identifier UUID NOT NULL REFERENCES substacks(substack_identifier),
    amount_cents INTEGER NOT NULL DEFAULT 0,
    frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'monthly')) DEFAULT 'monthly',
    next_run_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT (NOW()),
    updated_at TIMESTAMP NOT NULL DEFAULT (NOW()),
    CONSTRAINT unique_recurring_deposit UNIQUE (recurring_deposit_identifier)
  );
  CREATE INDEX IF NOT EXISTS idx_recurring_deposits_to ON recurring_deposits(to_identifier);
`;

/**
 * Binds a session to the user it authenticated as. The column is nullable so a
 * freshly created (anonymous) session is valid before signup/login completes.
 * Written idempotently so it is safe on both fresh and existing databases; the
 * foreign key is added separately under a guard because `ADD CONSTRAINT` is not
 * itself idempotent.
 */
export const SESSIONS_USER_BINDING_DDL = `
  ALTER TABLE IF EXISTS sessions ADD COLUMN IF NOT EXISTS user_identifier UUID;
  CREATE INDEX IF NOT EXISTS idx_sessions_user_identifier ON sessions(user_identifier);
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public'
        AND table_name = 'sessions'
        AND constraint_name = 'fk_sessions_user_identifier'
    ) THEN
      ALTER TABLE sessions
        ADD CONSTRAINT fk_sessions_user_identifier
        FOREIGN KEY (user_identifier)
        REFERENCES users (user_identifier);
    END IF;
  END $$;
`;

/**
 * Idempotent column additions for stacks/substacks/transactions that the
 * frontend integration relies on (goals, timestamps, transaction status, and
 * optional stack presentation metadata). Written with `IF EXISTS` /
 * `IF NOT EXISTS` so it is safe to run on both fresh and existing databases.
 */
export const FRONTEND_FIELDS_DDL = `
  ALTER TABLE IF EXISTS stacks ADD COLUMN IF NOT EXISTS goal_amount INTEGER;
  ALTER TABLE IF EXISTS stacks ADD COLUMN IF NOT EXISTS goal_deadline TIMESTAMP;
  ALTER TABLE IF EXISTS stacks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT (NOW());
  ALTER TABLE IF EXISTS stacks ADD COLUMN IF NOT EXISTS category TEXT;
  ALTER TABLE IF EXISTS stacks ADD COLUMN IF NOT EXISTS emoji TEXT;
  ALTER TABLE IF EXISTS substacks ADD COLUMN IF NOT EXISTS goal_amount INTEGER;
  ALTER TABLE IF EXISTS substacks ADD COLUMN IF NOT EXISTS goal_deadline TIMESTAMP;
  ALTER TABLE IF EXISTS substacks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT (NOW());
  ALTER TABLE IF EXISTS transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'settled';
`;
