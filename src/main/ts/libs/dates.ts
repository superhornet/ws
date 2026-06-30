/**
 * Normalizes a value that may arrive as a JS `Date` (node-postgres parses
 * TIMESTAMP columns into `Date`) or an ISO string into a canonical ISO-8601
 * string. Centralizes the conversion so models don't reach for
 * `as unknown as string` casts at the query boundary.
 */
export function toIso(value: Date | string): string {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
