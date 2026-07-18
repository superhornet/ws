import { randomFillSync } from "node:crypto";

/**
 * Generates UUID for uniquely identifying sessions
 * a UUIDv7 string (RFC 4122 draft).
 * No external dependencies.

 * @returns string
 */
export function generateUUID(): string {
    // Get current timestamp in milliseconds
    const now = Date.now();

    // Convert timestamp to 48-bit hex (12 hex chars)
    const timeHex = now.toString(16).padStart(12, "0");

    // Generate 74 random bits (we'll split them into sections)
    const randomBytes = new Uint8Array(10);
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        crypto.getRandomValues(randomBytes); // Browser
    } else {
        // Node.js
        randomFillSync(randomBytes);
    }

    // Assemble UUIDv7 parts
    // time_high_and_version: first 12 hex chars from timestamp + version (7)
    const timeHigh = timeHex.slice(0, 8); // first 32 bits
    const timeMid = timeHex.slice(8, 12); // next 16 bits

    // Version 7: set high 4 bits of byte 6 to 0111
    const byte6 = (randomBytes[0]! & 0x0f) | 0x70;

    // Variant: set high 2 bits of byte 8 to 10
    const byte8 = (randomBytes[2]! & 0x3f) | 0x80;

    // Format: 8-4-4-4-12
    return [
        timeHigh,
        timeMid,
        byte6.toString(16).padStart(2, "0") + randomBytes[1]!.toString(16).padStart(2, "0"),
        byte8.toString(16).padStart(2, "0") + randomBytes[3]!.toString(16).padStart(2, "0"),
        Array.from(randomBytes.slice(4), byte => byte.toString(16).padStart(2, "0")).join("")
    ].join("-");
}

// Example usage
// if (require.main === module) {
//     console.log("UUIDv7:", generateUUID());
//     console.log("Batch:", Array.from({ length: 5 }, () => generateUUID()));
// }

