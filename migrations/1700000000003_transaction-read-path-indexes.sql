-- Up Migration
-- Index the join/filter columns on the transaction history read path. Postgres
-- does not auto-index the referencing side of a foreign key, so these columns
-- were unindexed and every `Transaction.getTransactions` query degraded to a
-- sequential scan as the tables grow.
--
--   SUBSTACK query: transactions WHERE to_identifier = $1 OR from_identifier = $1
--   STACK query:    join substacks on from/to, filter substacks.stack_identifier
--   USER query:     ... join stacks on stack_identifier, filter stacks.owner_identifier
--
-- The two single-column transaction indexes let the planner bitmap-OR the
-- from/to predicate; the substacks/stacks indexes cover the join and owner filter.
--
-- Note: these run in a transaction (node-pg-migrate default), so plain CREATE
-- INDEX is used. On a large production table, prefer CREATE INDEX CONCURRENTLY
-- (outside a transaction) to avoid holding a write lock during the build.
CREATE INDEX idx_transactions_from_identifier ON transactions(from_identifier);
CREATE INDEX idx_transactions_to_identifier ON transactions(to_identifier);
CREATE INDEX idx_substacks_stack_identifier ON substacks(stack_identifier);
CREATE INDEX idx_stacks_owner_identifier ON stacks(owner_identifier);
CREATE INDEX idx_stacks_stack_identifier ON stacks(stack_identifier);

-- Down Migration
DROP INDEX IF EXISTS idx_stacks_stack_identifier;
DROP INDEX IF EXISTS idx_stacks_owner_identifier;
DROP INDEX IF EXISTS idx_substacks_stack_identifier;
DROP INDEX IF EXISTS idx_transactions_to_identifier;
DROP INDEX IF EXISTS idx_transactions_from_identifier;
