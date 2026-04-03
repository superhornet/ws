/**
 * Generates UUID for uniquely identifying sessions
 *
 * @returns string
 */
export function generateUUID(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID() as string;
    }

    throw new Error("crypto.randomUUID is not supported in this environment");
}
