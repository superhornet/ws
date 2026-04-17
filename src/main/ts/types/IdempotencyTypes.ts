export interface IdempotencyRecord {
    id: number;
    idempotency_key: string;
    session_id: string;
    route_path: string;
    status: "in_progress" | "completed";
    response_code: number | null;
    response_body: CachedResponse | null;
    created_at: string;
    completed_at: string | null;
}

export interface CachedResponse {
    code: number;
    data: unknown;
    message: string;
}
