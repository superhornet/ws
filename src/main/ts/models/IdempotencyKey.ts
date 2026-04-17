import { query } from "../libs/postgresDB.ts";
import type { IdempotencyRecord, CachedResponse } from "../types/IdempotencyTypes.ts";

export class IdempotencyKey {

    /**
     * Attempt to acquire an idempotency lock.
     * Returns the existing record if the key already exists, or null if a new lock was created.
     * Uses INSERT + catch unique_violation (23505) to handle concurrent races atomically.
     */
    static async acquire(
        sessionId: string,
        idempotencyKey: string,
        routePath: string
    ): Promise<IdempotencyRecord | null> {
        const existing = await query<IdempotencyRecord>(
            `SELECT * FROM idempotency_keys
             WHERE session_id = $1 AND idempotency_key = $2 AND route_path = $3`,
            [sessionId, idempotencyKey, routePath]
        );

        if (existing[0]) {
            return existing[0];
        }

        try {
            await query(
                `INSERT INTO idempotency_keys (session_id, idempotency_key, route_path, status)
                 VALUES ($1, $2, $3, 'in_progress')`,
                [sessionId, idempotencyKey, routePath]
            );
            return null;
        } catch (error: unknown) {
            if (
                error !== null &&
                typeof error === "object" &&
                "code" in error &&
                (error as { code: string }).code === "23505"
            ) {
                const raced = await query<IdempotencyRecord>(
                    `SELECT * FROM idempotency_keys
                     WHERE session_id = $1 AND idempotency_key = $2 AND route_path = $3`,
                    [sessionId, idempotencyKey, routePath]
                );
                if (raced[0]) {
                    return raced[0];
                }
            }
            throw error;
        }
    }

    /**
     * Mark the idempotency key as completed with the response to cache.
     */
    static async complete(
        sessionId: string,
        idempotencyKey: string,
        routePath: string,
        responseCode: number,
        responseBody: CachedResponse
    ): Promise<void> {
        await query(
            `UPDATE idempotency_keys
             SET status = 'completed',
                 response_code = $4,
                 response_body = $5,
                 completed_at = NOW()
             WHERE session_id = $1 AND idempotency_key = $2 AND route_path = $3`,
            [sessionId, idempotencyKey, routePath, responseCode, JSON.stringify(responseBody)]
        );
    }

    /**
     * Delete an in_progress record so retries can proceed after a transient failure.
     */
    static async release(
        sessionId: string,
        idempotencyKey: string,
        routePath: string
    ): Promise<void> {
        await query(
            `DELETE FROM idempotency_keys
             WHERE session_id = $1 AND idempotency_key = $2 AND route_path = $3
               AND status = 'in_progress'`,
            [sessionId, idempotencyKey, routePath]
        );
    }

    /**
     * Delete records older than maxAgeHours. Call periodically for cleanup.
     */
    static async cleanup(maxAgeHours: number = 24): Promise<void> {
        await query(
            `DELETE FROM idempotency_keys
             WHERE created_at < NOW() - make_interval(hours => $1)`,
            [maxAgeHours]
        );
    }
}
