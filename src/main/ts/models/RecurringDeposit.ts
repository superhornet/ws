import { HTMLStatusError, as500 } from "../libs/HTMLStatusError.ts";
import { query, withTransaction } from "../libs/postgresDB.ts";
import { toIso } from "../libs/dates.ts";
import {
    RecurringDepositFrequencyType,
    RecurringDepositQueryTypes,
    type RecurringDepositAPIType,
    type RecurringDepositFrequencyEnum,
} from "../types/RecurringDepositAPITypes.ts";

const VALID_FREQUENCIES = new Set<string>([
    RecurringDepositFrequencyType.WEEKLY,
    RecurringDepositFrequencyType.BIWEEKLY,
    RecurringDepositFrequencyType.MONTHLY,
]);

interface RecurringDepositRow {
    recurring_deposit_identifier: string;
    from_identifier: string;
    to_identifier: string;
    amount_cents: number;
    frequency: string;
    next_run_at: Date | string;
    created_at: Date | string;
    updated_at: Date | string;
}

function toApiType(row: RecurringDepositRow): RecurringDepositAPIType {
    return {
        recurring_deposit_identifier: row.recurring_deposit_identifier,
        from_identifier: row.from_identifier,
        to_identifier: row.to_identifier,
        amount_cents: row.amount_cents,
        // The DB column is a free `TEXT` constrained by a CHECK; narrow it to the
        // enum at this persistence boundary rather than weakening the API type.
        frequency: row.frequency as RecurringDepositFrequencyEnum,
        next_run_at: toIso(row.next_run_at),
        created_at: row.created_at ? toIso(row.created_at) : null,
        updated_at: row.updated_at ? toIso(row.updated_at) : null,
    };
}

const RETURNING =
    `recurring_deposit_identifier, from_identifier, to_identifier, amount_cents, frequency, next_run_at, created_at, updated_at`;

export class RecurringDeposit {
    /**
     * Creates a scheduled recurring deposit into a substack.
     */
    static async store(deposit: RecurringDepositAPIType): Promise<RecurringDepositAPIType> {
        if (!deposit.from_identifier || !deposit.to_identifier) {
            throw new HTMLStatusError("from_identifier and to_identifier are required", 400);
        }
        if (!VALID_FREQUENCIES.has(deposit.frequency)) {
            throw new HTMLStatusError("Invalid frequency", 400);
        }
        if (!deposit.next_run_at) {
            throw new HTMLStatusError("next_run_at is required", 400);
        }
        const amount = Number(deposit.amount_cents);
        if (!Number.isInteger(amount) || amount <= 0) {
            throw new HTMLStatusError("amount_cents must be a positive integer", 400);
        }
        try {
            const queryResult = await withTransaction((client) =>
                client.query<RecurringDepositRow>(
                    `INSERT INTO recurring_deposits (from_identifier, to_identifier, amount_cents, frequency, next_run_at)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING ${RETURNING};`,
                    [deposit.from_identifier, deposit.to_identifier, amount, deposit.frequency, deposit.next_run_at]
                )
            );
            const row = queryResult.rows.at(0);
            if (!row) {
                throw new HTMLStatusError("Failed to create recurring deposit", 500);
            }
            return toApiType(row);
        } catch (error) {
            as500(error);
        }
    }

    /**
     * Lists recurring deposits keyed by `substack_identifier` (destination) or
     * `stack_identifier` (any destination substack within the stack).
     */
    static async getByKey(key: string, value: string): Promise<RecurringDepositAPIType[]> {
        try {
            let rows: RecurringDepositRow[];
            switch (key) {
                case RecurringDepositQueryTypes.SUBSTACK:
                    rows = await query<RecurringDepositRow>(
                        `SELECT ${RETURNING} FROM recurring_deposits
                         WHERE deleted = FALSE AND to_identifier = $1::uuid
                         ORDER BY next_run_at ASC;`,
                        [value]
                    );
                    break;
                case RecurringDepositQueryTypes.STACK:
                    rows = await query<RecurringDepositRow>(
                        `SELECT rd.recurring_deposit_identifier, rd.from_identifier, rd.to_identifier, rd.amount_cents, rd.frequency, rd.next_run_at, rd.created_at, rd.updated_at
                         FROM recurring_deposits AS rd
                         INNER JOIN substacks AS ss ON rd.to_identifier = ss.substack_identifier
                         WHERE rd.deleted = FALSE AND ss.stack_identifier = $1::uuid
                         ORDER BY rd.next_run_at ASC;`,
                        [value]
                    );
                    break;
                default:
                    throw new HTMLStatusError("Invalid recurring deposit query key", 400);
            }
            return rows.map(toApiType);
        } catch (error) {
            as500(error);
        }
    }

    /**
     * Updates an existing recurring deposit. Omitted fields are preserved.
     */
    static async update(deposit: RecurringDepositAPIType): Promise<boolean> {
        if (!deposit.recurring_deposit_identifier) {
            throw new HTMLStatusError("recurring_deposit_identifier is required", 400);
        }
        if (deposit.frequency !== undefined && !VALID_FREQUENCIES.has(deposit.frequency)) {
            throw new HTMLStatusError("Invalid frequency", 400);
        }
        try {
            const queryResult = await withTransaction((client) =>
                client.query(
                    `UPDATE recurring_deposits
                     SET amount_cents = COALESCE($1, amount_cents),
                         frequency = COALESCE($2, frequency),
                         next_run_at = COALESCE($3, next_run_at),
                         from_identifier = COALESCE($4, from_identifier),
                         to_identifier = COALESCE($5, to_identifier),
                         updated_at = NOW()
                     WHERE deleted = FALSE AND recurring_deposit_identifier = $6;`,
                    [
                        deposit.amount_cents ?? null,
                        deposit.frequency ?? null,
                        deposit.next_run_at ?? null,
                        deposit.from_identifier ?? null,
                        deposit.to_identifier ?? null,
                        deposit.recurring_deposit_identifier,
                    ]
                )
            );
            if (queryResult.rowCount === 0) {
                throw new HTMLStatusError("Recurring deposit not found", 404);
            }
            return true;
        } catch (error) {
            as500(error);
        }
    }

    /**
     * Soft-cancels a recurring deposit.
     */
    static async remove(recurring_deposit_identifier: string): Promise<boolean> {
        if (!recurring_deposit_identifier) {
            throw new HTMLStatusError("recurring_deposit_identifier is required", 400);
        }
        try {
            const queryResult = await withTransaction((client) =>
                client.query(
                    `UPDATE recurring_deposits SET deleted = TRUE, updated_at = NOW()
                     WHERE deleted = FALSE AND recurring_deposit_identifier = $1;`,
                    [recurring_deposit_identifier]
                )
            );
            if (queryResult.rowCount === 0) {
                throw new HTMLStatusError("Recurring deposit not found", 404);
            }
            return true;
        } catch (error) {
            as500(error);
        }
    }
}
