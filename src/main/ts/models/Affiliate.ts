import { withTransaction } from "../libs/postgresDB.ts";
import { Validator } from "../libs/Validator.ts";
import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { AffiliationType, type AffiliateAPIType } from "../types/AffiliateAPITypes.ts";

export interface IAffiliate {
    detail(): AffiliateAPIType;
}

export class Affiliate implements IAffiliate {
    private pAffiliate!: AffiliateAPIType;
    public get affiliate(): AffiliateAPIType {
        return this.pAffiliate;
    }
    public set affiliate(value: AffiliateAPIType) {
        this.pAffiliate = value;
    }
    /**
     * @author Caleb King
     * @param {string} code 7-8 character affiliate code
     */
    constructor(affiliate: AffiliateAPIType) {
        try {
            this.affiliate = affiliate
        } catch (error) {
            throw new Error((error as Error).message);
        }
    }
    /**
     * When a user signs up with another user's affiliate code,
     * an entry is made in the affiliation table to show that
     * the new user is a descendant and the predecessor is the
     * ancestor. The affiliation table can be used to generate
     * a tree of ancestry.
     *
     * @param code
     */
    // TODO: Create process to make ancestry tree, with counts of descendants per code
    static async connect(code: string, user_identifier: string) {
        const vCode = new Validator({
            version: "1.0",
            stringValidation: {
                minLength: 7,
                maxLength: 8
            }
        });
        if (vCode.stringValidate(code)) {
            const queryResult = await withTransaction(async (client) => {
                const relation = await client.query(
                    `SELECT affiliate, user_identifier FROM users WHERE affiliate = $1;`,
                    [code]
                );
                const refCode = relation.rows.at(0);
                if (!refCode) {
                    throw new HTMLStatusError("Affiliate code not found", 404);
                }
                return await client.query(
                    `INSERT INTO affiliations (affiliation_code, affiliation_type, referrer)
                        VALUES( $1, $2, $3 ),($4, $5, $6)
                        RETURNING affiliation_code, affiliation_type, referrer;`,
                    [
                        refCode.affiliate, AffiliationType.ANCESTOR, refCode.user_identifier,
                        refCode.affiliate, AffiliationType.DESCENDANT, user_identifier
                    ]
                );
            });
            const entries: Array<AffiliateAPIType> = [];
            for (const row of queryResult.rows) {
                const affiliateEntry = new Affiliate({
                    affiliation_code: row.affiliation_code,
                    affiliation_type: row.affiliation_type,
                    referrer: row.referrer
                });
                entries.push(affiliateEntry.affiliate);
            }
            return entries;
        } else {
            throw new HTMLStatusError("Code failed", 400);
        }
    };
    public detail(): AffiliateAPIType {
        return this.affiliate
    }
}
