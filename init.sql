DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions(
    id SERIAL PRIMARY KEY,
    expires TIMESTAMP DEFAULT (NOW() + INTERVAL '30 minutes'),
    otp TEXT NOT NULL CHECK(length(otp) = 6),
    uuid TEXT NOT NULL CHECK(length(uuid) = 36)
);

DROP TABLE IF EXISTS audit;
CREATE TABLE audit(
    id SERIAL PRIMARY KEY,
    message TEXT NOT NULL,
    session TEXT NOT NULL CHECK(length(session) = 36),
    time_at timestamp NOT NULL DEFAULT (NOW()),
    type TEXT
    );

DROP TABLE IF EXISTS users;
CREATE TABLE users(
    id SERIAL PRIMARY KEY,
    deleted BOOLEAN DEFAULT FALSE,
    email TEXT NOT NULL,
    emailHost TEXT NOT NULL,
    emailID TEXT NOT NULL,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    user_identifier TEXT NOT NULL CHECK(length(user_identifier) = 36),
    address1 TEXT NOT NULL,
    address2 TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    level TEXT CHECK(level in ('Free', 'Basic', 'Pro')) NOT NULL DEFAULT 'Free',
    created_at TIMESTAMP DEFAULT (NOW())
  );

DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications(
    id SERIAL PRIMARY KEY,
    deleted BOOLEAN DEFAULT FALSE,
    notification_identifier TEXT CHECK(length(notification_identifier) = 36),
    seen BOOLEAN DEFAULT FALSE,
    message TEXT NOT NULL
  );

DROP TABLE IF EXISTS stacks;
CREATE TABLE stacks(
    id INTEGER PRIMARY KEY,
    deleted BOOLEAN DEFAULT FALSE,
    ownerIdentifier TEXT CHECK(length(ownerIdentifier) = 36),
    stackName TEXT NOT NULL,
    stackIdentifier TEXT CHECK(length(stackIdentifier) = 36),
    createdOn TEXT NOT NULL DEFAULT (NOW()),
    createdBy INTEGER
    );

DROP TABLE IF EXISTS substacks;
CREATE TABLE substacks(
    id INTEGER PRIMARY KEY,
    balance INTEGER DEFAULT 0, --Value in cents
    createdOn TEXT NOT NULL DEFAULT (NOW()),
    createdBy INTEGER,
    deleted INTEGER DEFAULT 0 CHECK(deleted in (0, 1)),
    stackIdentifier TEXT CHECK(length(stackIdentifier) = 36),
    substackIdentifier TEXT CHECK(length(substackIdentifier) = 36),
    substackName TEXT NOT NULL,
    usersList TEXT NOT NULL
  );

DROP TABLE IF EXISTS transactions;
CREATE TABLE transactions(
    id INTEGER PRIMARY KEY,
    amount INTEGER DEFAULT 0, --value in cents
    balance INTEGER DEFAULT 0, --value in cents, running total
    occurredOn TEXT NOT NULL DEFAULT (NOW()),
    processor TEXT CHECK(processor IN ('Internal', 'ACH', 'Moonpay', 'Stripe', 'Apple', 'Google', 'CashApp', 'Bitcoin')) NOT NULL DEFAULT 'Internal',
    processedOn TEXT DEFAULT (NOW()),
    fromID INTEGER DEFAULT NULL,
    toID INTEGER DEFAULT NULL,
    fromName TEXT DEFAULT NULL,
    toName TEXT DEFAULT NULL,
    notation TEXT DEFAULT NULL,
    transactionType TEXT CHECK(transactionType IN ('Initial', 'Credit', 'Debit', 'Fee', 'Penalty', 'Adjustment', 'Settled', 'Roundup')) NOT NULL DEFAULT 'Credit'
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
