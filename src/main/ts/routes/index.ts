
import * as express from "express";
import JSONResponse from "../libs/JSONResponse.ts";
import { DatabaseSync } from "node:sqlite";
export const router = express.Router();

/**
 * Route for /health
 */
router.get("/health", (req, res) => {
  try {
    JSONResponse.goodToGo(req, res, "OK", null);
  } catch (error) {
        JSONResponse.badRequest(req, res, (error as Error).message, null);
  }
});

router.get("/reset", (req, res) => {
    try {
        const db = new DatabaseSync('westack.db');
        db.exec(`
  DROP TABLE IF EXISTS sessions;
  CREATE TABLE sessions(
    id INTEGER PRIMARY KEY,
    expires TEXT NOT NULL DEFAULT (datetime('now', '+30 minutes')),
    uuid TEXT NOT NULL CHECK(length(uuid) = 36)
  ) STRICT;
  INSERT INTO sessions (uuid) VALUES ('69dce0e3-e06c-48ed-86af-e5de2dc73fd3');
  INSERT INTO sessions (uuid) VALUES ('06bd8763-8326-4ac4-b86e-418ac9ce3354');

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
  INSERT INTO users (email, emailID, emailHost, firstname, lastname, identifier, city, state, level) VALUES ('admin@westack.cash', 'admin', 'westack.cash', 'WeStack', 'Admin', '77ffeca5-3c97-4470-a27c-8e7e1c1eba01', 'Tampa', 'FL', 'Pro');
  INSERT INTO users (email, emailID, emailHost, firstname, lastname, identifier, city, state, level) VALUES ('pam@protonmail.com', 'pam', 'protonmail.com', 'Pamela', 'Smith', '7e3413f4-a751-45a0-8d17-77e991d51e07', 'Wakanda Heights', 'Ne', 'Free');
  INSERT INTO users (email, emailID, emailHost, firstname, lastname, identifier, city, state, level) VALUES ('king.caleb.i.bsce.mfa@gmail.com', 'king.caleb.i.bsce.mfa', 'gmail.com', 'Caleb', 'King', 'ad892fcb-21cd-4c7d-8ac9-8b561dcc7088', 'Tampa', 'FL', 'Basic');

  DROP TABLE IF EXISTS notifications;
  CREATE TABLE notifications(
    id INTEGER PRIMARY KEY,
    deleted INTEGER DEFAULT 0 CHECK(deleted in (0, 1)),
    identifier TEXT CHECK(length(identifier) = 36),
    seen INTEGER DEFAULT 0 CHECK(seen in (0, 1)),
    message TEXT NOT NULL
  ) STRICT;
  INSERT INTO notifications (deleted, identifier, seen, message) VALUES (0, 'ad892fcb-21cd-4c7d-8ac9-8b561dcc7088', 1, 'Knowledge is half the battle.');
  INSERT INTO notifications (deleted, identifier, seen, message) VALUES (0, 'ad892fcb-21cd-4c7d-8ac9-8b561dcc7088', 0, 'And that''s one to grow on.');

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
  INSERT INTO stacks (ownerIdentifier, stackName, stackIdentifier, createdBy) VALUES ('77ffeca5-3c97-4470-a27c-8e7e1c1eba01', 'Company', '4fc8059d-3933-4cc3-9e67-0ede2869b617', 1);
  INSERT INTO stacks (ownerIdentifier, stackName, stackIdentifier, createdBy) VALUES ('7e3413f4-a751-45a0-8d17-77e991d51e07', 'Appliances', 'b67bae42-cd65-4a7f-a5b7-4e2f4152e333', 2);
  INSERT INTO stacks (ownerIdentifier, stackName, stackIdentifier, createdBy) VALUES ('7e3413f4-a751-45a0-8d17-77e991d51e07', 'Tools', '9541d354-b936-42da-a358-add057e5f287', 2);

    DROP TABLE IF EXISTS substacks;
    CREATE TABLE substacks(
    id INTEGER PRIMARY KEY,
    deleted INTEGER DEFAULT 0 CHECK(deleted in (0, 1)),
    balance INTEGER DEFAULT 0, --Value in cents
    createdOn TEXT NOT NULL DEFAULT (datetime('now')),
    createdBy INTEGER,
    stackIdentifier TEXT CHECK(length(stackIdentifier) = 36),
    substackIdentifier TEXT CHECK(length(substackIdentifier) = 36),
    substackName TEXT NOT NULL,
    usersList TEXT NOT NULL
  ) STRICT;
  INSERT INTO substacks (balance, createdBy, stackIdentifier, substackIdentifier, substackName, usersList) VALUES (0, 1, '4fc8059d-3933-4cc3-9e67-0ede2869b617', '83d13d18-3802-407f-b9b6-73f39b17e31d', 'Funds', '1,1');
  INSERT INTO substacks (balance, createdBy, stackIdentifier, substackIdentifier, substackName, usersList) VALUES (0, 2, 'e3168ef7-7db3-4a9d-8cae-26ee59b024d7', '307eeeef-c2eb-4e0e-965a-d7b55b153227', 'Flatscreen TV', '2,2');
  INSERT INTO substacks (balance, createdBy, stackIdentifier, substackIdentifier, substackName, usersList) VALUES (0, 2, 'e3168ef7-7db3-4a9d-8cae-26ee59b024d7', 'ee84918f-406d-4aa3-87ce-bd1e1c72b464', 'Cotton Candy Machine', '2,2,3,3');

DROP TABLE IF EXISTS transactions;
CREATE TABLE transactions(
    id INTEGER PRIMARY KEY,
    amount INTEGER DEFAULT 0, --value in cents
    balance INTEGER DEFAULT 0, --value in cents, running total
    occurredOn TEXT NOT NULL DEFAULT (datetime('now')),
    processor TEXT CHECK(processor IN ('Internal', 'ACH', 'Moonpay', 'Stripe', 'Apple', 'Google', 'CashApp', 'Bitcoin')) NOT NULL DEFAULT 'Internal',
    processedOn TEXT DEFAULT (datetime('now')),
    fromID INTEGER DEFAULT NULL,
    toID INTEGER DEFAULT NULL,
    fromName TEXT DEFAULT NULL,
    toName TEXT DEFAULT NULL,
    notation TEXT DEFAULT NULL,
    transactionType TEXT CHECK(transactionType IN ('Initial', 'Credit', 'Debit', 'Fee', 'Penalty', 'Adjustment', 'Settled', 'Roundup')) NOT NULL DEFAULT 'Credit'

) STRICT;

`);
        db.close()
        JSONResponse.goodToGo(req, res, "OK", null);
    } catch (error) {
        JSONResponse.serverError(req, res, (error as Error).message, null);
    }
})
