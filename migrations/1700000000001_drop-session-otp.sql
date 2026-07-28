-- Up Migration
-- L1: the legacy per-session `otp` is vestigial. Authentication uses the
-- separate `otp_requests` table; `sessions.otp` was generated, stored, and
-- returned to clients but never consumed. Drop it so no unused secret-looking
-- value is emitted.
ALTER TABLE sessions DROP COLUMN otp;

-- Down Migration
-- Restore the column. The default backfills existing rows to satisfy NOT NULL,
-- then is dropped so new inserts must supply the value again (as before).
ALTER TABLE sessions ADD COLUMN otp TEXT NOT NULL DEFAULT 'AAAAAA' CHECK(length(otp) = 6);
ALTER TABLE sessions ALTER COLUMN otp DROP DEFAULT;
