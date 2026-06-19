export type { Wallet } from "@privy-io/node";

/**
 * Owner of a server wallet — either an existing Privy user id or a raw
 * P-256 authorization public key. Mirrors the SDK's (non-root-exported)
 * `OwnerInput` union without coupling to internal SDK paths.
 */
export type WalletOwnerInput = { user_id: string } | { public_key: string };

export type WalletChainType = "ethereum" | "solana";

export interface WalletCreateInput {
    chain_type: WalletChainType;
    owner?: WalletOwnerInput;
    display_name?: string;
    external_id?: string;
}

export interface WalletListQuery {
    user_id?: string;
    external_id?: string;
    chain_type?: WalletChainType;
    cursor?: string;
    limit?: number;
}

/** Create-wallet request body shape (carries the session like other controllers). */
export interface CreateWalletRequest extends WalletCreateInput {
    session: string;
}
