import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { toHttpError } from "../libs/httpErrorWrap.ts";
import * as PrivyClient from "../libs/PrivyClient.ts";
import type { Wallet, WalletCreateInput, WalletListQuery } from "../types/PrivyAPITypes.ts";

export class Privy {

    // --- Wallets ---

    static createWallet(input: WalletCreateInput): Promise<Wallet> {
        return toHttpError(() => {
            if (input.chain_type !== "ethereum" && input.chain_type !== "solana") {
                throw new HTMLStatusError("Invalid chain type", 400);
            }
            return PrivyClient.createWallet(input);
        });
    }

    static getWallet(walletId: string): Promise<Wallet> {
        return toHttpError(() => {
            if (!walletId) {
                throw new HTMLStatusError("Wallet ID Required", 400);
            }
            return PrivyClient.getWallet(walletId);
        });
    }

    static listWallets(query: WalletListQuery): Promise<{ data: Wallet[]; next_cursor: string }> {
        return toHttpError(() => PrivyClient.listWallets(query));
    }
}
