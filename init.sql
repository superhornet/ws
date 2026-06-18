DROP TABLE IF EXISTS raffle_entries;
DROP TABLE IF EXISTS affiliations CASCADE;
DROP TABLE IF EXISTS stacks;
DROP TABLE IF EXISTS substacks CASCADE;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions(
    id SERIAL PRIMARY KEY,
    expires TIMESTAMP DEFAULT (NOW() + INTERVAL '30 minutes'),
    otp TEXT NOT NULL CHECK(length(otp) = 6),
    uuid UUID DEFAULT gen_random_uuid()
);

DROP TABLE IF EXISTS audit;
CREATE TABLE audit(
    id SERIAL PRIMARY KEY,
    deleted BOOLEAN DEFAULT FALSE,
    message TEXT NOT NULL,
    session UUID DEFAULT gen_random_uuid(),
    time_at timestamp NOT NULL DEFAULT (NOW()),
    type TEXT
    );

DROP TABLE IF EXISTS users;
CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    deleted BOOLEAN DEFAULT FALSE,
    email TEXT NOT NULL,
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
CREATE TABLE affiliations(
    id SERIAL PRIMARY KEY,
    affiliation_code TEXT NOT NULL CHECK(length(affiliation_code) = 7),
    affiliation_type TEXT CHECK(affiliation_type IN ('Ancestor', 'Descendant')) NOT NULL DEFAULT 'Descendant',
    referrer UUID REFERENCES users(user_identifier),
    CONSTRAINT fk_affiliation_code_users_affiliate
        FOREIGN KEY (affiliation_code)
        REFERENCES users (affiliate)
    ,
    CONSTRAINT fk_referrer_users_user_identifier
        FOREIGN KEY (referrer)
        REFERENCES users (user_identifier)
    );
DROP TABLE IF EXISTS notifications;
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
    created_at TIMESTAMP DEFAULT (NOW()),
    created_by INTEGER,
    CONSTRAINT fk_owner_id
        FOREIGN KEY (owner_identifier)
        REFERENCES users (user_identifier)
    );

CREATE TABLE substacks(
    id SERIAL PRIMARY KEY,
    balance INTEGER DEFAULT 0, --Value in cents
    created_at TIMESTAMP DEFAULT (NOW()),
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
    amount INTEGER DEFAULT 0, --value in cents
    initiated_by UUID NOT NULL REFERENCES users(user_identifier),
    occurred_at TIMESTAMP NOT NULL DEFAULT (NOW()),
    processor TEXT CHECK(processor IN ('Internal', 'ACH', 'Moonpay', 'Stripe', 'Apple', 'Google', 'CashApp', 'Bitcoin')) NOT NULL DEFAULT 'Internal',
    processed_at TIMESTAMP DEFAULT NULL,
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

DROP TABLE IF EXISTS raffles;
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

DROP TABLE IF EXISTS idempotency_keys;
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
