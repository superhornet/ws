import { HTMLStatusError } from "./HTMLStatusError.ts";

export async function toHttpError<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (error instanceof HTMLStatusError) throw error;
        throw new HTMLStatusError((error as Error).message, 500);
    }
}

export function requireGuid(value: string | undefined, label: string): asserts value is string {
    if (!value) {
        throw new HTMLStatusError(`${label} GUID is required`, 400);
    }
}
