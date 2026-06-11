import * as dotenv from 'dotenv';
import { PrivyClient } from '@privy-io/node';
import type { Wallet } from '@privy-io/node';
import { HTMLStatusError } from './HTMLStatusError.ts';
import type { WalletCreateInput, WalletListQuery } from '../types/PrivyAPITypes.ts';

dotenv.config({ quiet: true });

const PRIVY_APP_ID = process.env.PRIVY_APP_ID || '';
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET || '';
const PRIVY_API_URL = process.env.PRIVY_API_URL;

/**
 * Privy authenticates per-request via HTTP Basic (`app-id:app-secret`), so —
 * unlike Cybrid — there is no OAuth2 bearer token to cache. We just hold one
 * lazily-constructed client singleton.
 */
let client: PrivyClient | null = null;

function getClient(): PrivyClient {
    if (client) {
        return client;
    }
    if (!PRIVY_APP_ID || !PRIVY_APP_SECRET) {
        throw new HTMLStatusError('Privy API credentials not configured', 500);
    }
    client = new PrivyClient({
        appId: PRIVY_APP_ID,
        appSecret: PRIVY_APP_SECRET,
        ...(PRIVY_API_URL ? { apiUrl: PRIVY_API_URL } : {}),
    });
    return client;
}

// --- Wallets ---

export async function createWallet(input: WalletCreateInput): Promise<Wallet> {
    return getClient().wallets().create(input);
}

export async function getWallet(walletId: string): Promise<Wallet> {
    return getClient().wallets().get(walletId);
}

export async function listWallets(query: WalletListQuery): Promise<{ data: Wallet[]; next_cursor: string }> {
    const page = await getClient().wallets().list(query);
    return { data: page.data, next_cursor: page.next_cursor };
}
