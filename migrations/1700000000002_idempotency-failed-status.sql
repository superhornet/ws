-- Up Migration
-- Add a terminal `failed` state to idempotency_keys. Once a key is acquired it
-- is never deleted: it resolves to `completed` (replay the cached success) or
-- `failed` (the operation may have partially executed against the external
-- provider, so the same key must never re-run it). This closes the double-spend
-- window where an error after the external side-effect deleted the lock and let
-- a retry with the same key execute the transfer a second time.
ALTER TABLE idempotency_keys DROP CONSTRAINT idempotency_keys_status_check;
ALTER TABLE idempotency_keys ADD CONSTRAINT idempotency_keys_status_check
    CHECK (status IN ('in_progress', 'completed', 'failed'));

-- Down Migration
-- Collapse any `failed` rows back to `in_progress` so the stricter constraint
-- can be re-applied without violation.
UPDATE idempotency_keys SET status = 'in_progress' WHERE status = 'failed';
ALTER TABLE idempotency_keys DROP CONSTRAINT idempotency_keys_status_check;
ALTER TABLE idempotency_keys ADD CONSTRAINT idempotency_keys_status_check
    CHECK (status IN ('in_progress', 'completed'));
