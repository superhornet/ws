import { HTMLStatusError } from "./HTMLStatusError.ts";

export async function toHttpError<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (error instanceof HTMLStatusError) throw error;
        throw new HTMLStatusError((error as Error).message, 500);
    }
}