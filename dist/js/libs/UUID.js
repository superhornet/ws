/**
 * Generates UUID for uniquely identifying sessions
 *
 * @returns string
 */
export function generateUUID() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    throw new Error("crypto.randomUUID is not supported in this environment");
}
//# sourceMappingURL=UUID.js.map