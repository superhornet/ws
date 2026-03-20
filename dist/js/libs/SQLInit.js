import { DatabaseSync } from "node:sqlite";
export const database = new DatabaseSync("westack.db");
/**
 * Execute SQL statements from strings.
 */
database.exec(`
  DROP TABLE IF EXISTS sessions;
  CREATE TABLE sessions(
    id INTEGER PRIMARY KEY,
    expires TEXT NOT NULL DEFAULT (datetime('now', '+30 minutes')),
    uuid TEXT NOT NULL CHECK(length(uuid) = 36)
  ) STRICT;

  DROP TABLE IF EXISTS audit;
  CREATE TABLE audit(
    id INTEGER PRIMARY KEY,
    message TEXT NOT NULL,
    session TEXT NOT NULL CHECK(length(session) = 36),
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    type TEXT
    ) STRICT;

  DROP TABLE IF EXISTS users;
  CREATE TABLE users(
    id INTEGER PRIMARY KEY,
    deleted INTEGER DEFAULT 0 CHECK(deleted in (0, 1)),
    email TEXT NOT NULL,
    emailHost TEXT NOT NULL,
    emailID TEXT NOT NULL,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    identifier TEXT NOT NULL CHECK(length(identifier) = 36),
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    level TEXT CHECK(level in ('Free', 'Basic', 'Pro')) NOT NULL DEFAULT 'Free',
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
  ) STRICT;

  DROP TABLE IF EXISTS notifications;
  CREATE TABLE notifications(
    id INTEGER PRIMARY KEY,
    deleted INTEGER DEFAULT 0 CHECK(deleted in (0, 1)),
    identifier TEXT CHECK(length(identifier) = 36),
    seen INTEGER DEFAULT 0 CHECK(seen in (0, 1)),
    message TEXT NOT NULL
  ) STRICT;

  DROP TABLE IF EXISTS stacks;
  CREATE TABLE stacks(
    id INTEGER PRIMARY KEY,
    deleted INTEGER DEFAULT 0 CHECK(deleted in (0, 1)),
    ownerIdentifier TEXT CHECK(length(ownerIdentifier) = 36),
    stackName TEXT NOT NULL,
    stackIdentifier TEXT CHECK(length(stackIdentifier) = 36),
    createdOn TEXT NOT NULL DEFAULT (datetime('now')),
    createdBy INTEGER
    ) STRICT;

    DROP TABLE IF EXISTS substacks;
    CREATE TABLE substacks(
    id INTEGER PRIMARY KEY,
    balance INTEGER DEFAULT 0, --Value in cents
    createdOn TEXT NOT NULL DEFAULT (datetime('now')),
    createdBy INTEGER,
    deleted INTEGER DEFAULT 0 CHECK(deleted in (0, 1)),
    stackIdentifier TEXT CHECK(length(stackIdentifier) = 36),
    substackIdentifier TEXT CHECK(length(substackIdentifier) = 36),
    substackName TEXT NOT NULL,
    usersList TEXT NOT NULL
  ) STRICT;

DROP TABLE IF EXISTS transactions;
CREATE TABLE transactions(
    id INTEGER PRIMARY KEY,
    amount INTEGER DEFAULT 0, --value in cents
    balance INTEGER DEFAULT 0, --value in cents, running total
    occurredOn TEXT NOT NULL DEFAULT (datetime('now')),
    processor TEXT CHECK(processor IN ('Internal', 'ACH', 'Moonpay', 'Stripe', 'Apple', 'Google', 'CashApp', 'Bitcoin')) NOT NULL DEFAULT 'Internal',
    processedOn TEXT NOT NULL DEFAULT (datetime('now')),
    fromID INTEGER DEFAULT NULL,
    toID INTEGER DEFAULT NULL,
    fromName TEXT DEFAULT NULL,
    toName TEXT DEFAULT NULL,
    notation TEXT DEFAULT NULL,
    transactionType TEXT CHECK(transactionType IN ('Initial', 'Credit', 'Debit', 'Fee', 'Penalty', 'Adjustment', 'Settled', 'Roundup')) NOT NULL DEFAULT 'Credit'

) STRICT;

`);
database.close();
//# sourceMappingURL=SQLInit.js.map