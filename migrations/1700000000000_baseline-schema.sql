-- Up Migration
-- Baseline schema for a fresh WeStack database. This is the single source of
-- truth for the initial schema; subsequent changes are added as new migrations.

CREATE TABLE sessions(
    id SERIAL PRIMARY KEY,
    expires TIMESTAMP DEFAULT (NOW() + INTERVAL '30 minutes'),
    otp TEXT NOT NULL CHECK(length(otp) = 6),
    uuid UUID DEFAULT gen_random_uuid(),
    -- Bound user once the session has authenticated (signup or login OTP).
    -- NULL while the session is still anonymous. The FK is added after the
    -- users table is created below.
    user_identifier UUID
);

CREATE TABLE audit(
    id SERIAL PRIMARY KEY,
    deleted BOOLEAN DEFAULT FALSE,
    message TEXT NOT NULL,
    session UUID DEFAULT gen_random_uuid(),
    time_at TIMESTAMP NOT NULL DEFAULT (NOW()),
    type TEXT
);

CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    deleted BOOLEAN DEFAULT FALSE,
    email TEXT NOT NULL,
    phone_e164 TEXT,
    email_host TEXT NOT NULL,
    emailid TEXT NOT NULL,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    user_identifier UUID DEFAULT gen_random_uuid(),
    affiliate TEXT NOT NULL CHECK(length(affiliate) = 7),
    address1 TEXT NOT NULL,
    address2 TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zipcode TEXT NOT NULL,
    subscription_level TEXT CHECK(subscription_level in ('Free', 'Basic', 'Pro')) NOT NULL DEFAULT 'Free',
    created_at TIMESTAMP DEFAULT (NOW()),
    CONSTRAINT unique_user UNIQUE (user_identifier),
    CONSTRAINT unique_affiliate UNIQUE (affiliate)
);
CREATE UNIQUE INDEX idx_users_phone_e164 ON users(phone_e164) WHERE phone_e164 IS NOT NULL AND deleted = FALSE;

-- Bind sessions to a user now that the users table exists.
ALTER TABLE sessions
    ADD CONSTRAINT fk_sessions_user_identifier
    FOREIGN KEY (user_identifier)
    REFERENCES users (user_identifier);
CREATE INDEX idx_sessions_user_identifier ON sessions(user_identifier);

CREATE TABLE otp_requests(
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
CREATE INDEX idx_otp_requests_lookup ON otp_requests(channel, destination_hash, purpose, created_at DESC);
CREATE INDEX idx_otp_requests_session ON otp_requests(session_uuid);

CREATE TABLE affiliations(
    id SERIAL PRIMARY KEY,
    affiliation_code TEXT NOT NULL CHECK(length(affiliation_code) = 7),
    affiliation_type TEXT CHECK(affiliation_type IN ('Ancestor', 'Descendant')) NOT NULL DEFAULT 'Descendant',
    referrer UUID REFERENCES users(user_identifier),
    CONSTRAINT fk_affiliation_code_users_affiliate
        FOREIGN KEY (affiliation_code)
        REFERENCES users (affiliate),
    CONSTRAINT fk_referrer_users_user_identifier
        FOREIGN KEY (referrer)
        REFERENCES users (user_identifier)
);

CREATE TABLE notifications(
    id SERIAL PRIMARY KEY,
    deleted BOOLEAN DEFAULT FALSE,
    notification_identifier UUID DEFAULT gen_random_uuid(),
    notification_for UUID DEFAULT NULL,
    seen BOOLEAN DEFAULT FALSE,
    message TEXT NOT NULL
);

CREATE TABLE stacks(
    id SERIAL PRIMARY KEY,
    deleted BOOLEAN DEFAULT FALSE,
    owner_identifier UUID REFERENCES users(user_identifier),
    stack_name TEXT NOT NULL,
    stack_identifier UUID DEFAULT gen_random_uuid(),
    goal_amount INTEGER, -- Target in cents, NULL when unset
    goal_deadline TIMESTAMP,
    category TEXT,
    emoji TEXT,
    created_at TIMESTAMP DEFAULT (NOW()),
    updated_at TIMESTAMP DEFAULT (NOW()),
    created_by INTEGER,
    CONSTRAINT fk_owner_id
        FOREIGN KEY (owner_identifier)
        REFERENCES users (user_identifier)
);

CREATE TABLE substacks(
    id SERIAL PRIMARY KEY,
    balance INTEGER DEFAULT 0, -- Value in cents
    goal_amount INTEGER, -- Target in cents, NULL when unset
    goal_deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT (NOW()),
    updated_at TIMESTAMP DEFAULT (NOW()),
    created_by INTEGER,
    deleted BOOLEAN DEFAULT FALSE,
    stack_identifier UUID,
    substack_identifier UUID DEFAULT gen_random_uuid(),
    substack_name TEXT NOT NULL,
    users_list TEXT NOT NULL,
    CONSTRAINT unique_substack UNIQUE (substack_identifier)
);

CREATE TABLE transactions(
    id SERIAL PRIMARY KEY,
    amount INTEGER DEFAULT 0, -- Value in cents
    initiated_by UUID NOT NULL REFERENCES users(user_identifier),
    occurred_at TIMESTAMP NOT NULL DEFAULT (NOW()),
    processor TEXT CHECK(processor IN ('Internal', 'ACH', 'Moonpay', 'Stripe', 'Apple', 'Google', 'CashApp', 'Bitcoin')) NOT NULL DEFAULT 'Internal',
    processed_at TIMESTAMP DEFAULT NULL,
    status TEXT CHECK(status IN ('pending', 'settled', 'failed')) NOT NULL DEFAULT 'settled',
    from_identifier UUID NOT NULL REFERENCES substacks(substack_identifier),
    to_identifier UUID NOT NULL REFERENCES substacks(substack_identifier),
    notation TEXT DEFAULT NULL,
    transaction_type TEXT CHECK(transaction_type IN ('Initial', 'Credit', 'Debit', 'Fee', 'Penalty', 'Adjustment', 'Settled', 'Roundup')) NOT NULL DEFAULT 'Credit',
    CONSTRAINT fk_user
        FOREIGN KEY (initiated_by)
        REFERENCES users (user_identifier),
    CONSTRAINT fk_from_substack
        FOREIGN KEY (from_identifier)
        REFERENCES substacks (substack_identifier),
    CONSTRAINT fk_to_substack
        FOREIGN KEY (to_identifier)
        REFERENCES substacks (substack_identifier)
);

CREATE TABLE recurring_deposits(
    id SERIAL PRIMARY KEY,
    recurring_deposit_identifier UUID DEFAULT gen_random_uuid(),
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
CREATE INDEX idx_recurring_deposits_to ON recurring_deposits(to_identifier);

CREATE TABLE raffles(
    raffle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_name TEXT NOT NULL,
    drawing_date TIMESTAMP DEFAULT (NOW() + INTERVAL '30 Days')
);

CREATE TABLE raffle_entries(
    entry_id SERIAL PRIMARY KEY,
    raffle_key UUID NOT NULL,
    entry_user UUID NOT NULL REFERENCES users(user_identifier),
    CONSTRAINT fk_raffle
        FOREIGN KEY (raffle_key)
        REFERENCES raffles (raffle_id),
    CONSTRAINT fk_user
        FOREIGN KEY (entry_user)
        REFERENCES users (user_identifier)
);

CREATE TABLE idempotency_keys(
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
CREATE INDEX idx_idempotency_keys_created ON idempotency_keys(created_at);

-- Down Migration
DO $$
BEGIN
    RAISE EXCEPTION 'Refusing to roll back baseline schema migration. Use an explicit reset script for disposable local databases.';
END
$$;
