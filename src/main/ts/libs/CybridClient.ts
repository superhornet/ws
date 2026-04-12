import * as dotenv from 'dotenv';
// @ts-expect-error - xhr2 has no type definitions
import XMLHttpRequest from 'xhr2';
(globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = XMLHttpRequest;
import { firstValueFrom } from 'rxjs';
import {
    Configuration,
    CustomersBankApi,
    AccountsBankApi,
    QuotesBankApi,
    TradesBankApi,
    TransfersBankApi,
    IdentityVerificationsBankApi,
    SymbolsBankApi,
    PostQuoteBankModelProductTypeEnum,
    PostTransferBankModelTransferTypeEnum,
    PostTransferParticipantBankModelTypeEnum,
} from '@cybrid/cybrid-api-bank-typescript';
import type {
    CustomerBankModel,
    CustomerListBankModel,
    PostCustomerBankModel,
    AccountBankModel,
    AccountListBankModel,
    PostAccountBankModel,
    QuoteBankModel,
    QuoteListBankModel,
    PostQuoteBankModel,
    TradeBankModel,
    TradeListBankModel,
    PostTradeBankModel,
    TransferBankModel,
    TransferListBankModel,
    PostTransferBankModel,
    IdentityVerificationBankModel,
    IdentityVerificationListBankModel,
    IdentityVerificationWithDetailsBankModel,
    PostIdentityVerificationBankModel,
} from '@cybrid/cybrid-api-bank-typescript';
import { HTMLStatusError } from './HTMLStatusError.ts';

dotenv.config({ quiet: true });

const CYBRID_API_BASE = process.env.CYBRID_API_BASE || 'https://bank.sandbox.cybrid.app';
const CYBRID_AUTH_URL = process.env.CYBRID_AUTH_URL || 'https://id.sandbox.cybrid.app/oauth/token';
const CYBRID_CLIENT_ID = process.env.CYBRID_CLIENT_ID || '';
const CYBRID_CLIENT_SECRET = process.env.CYBRID_CLIENT_SECRET || '';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

interface CybridTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

async function getAccessToken(): Promise<string> {
    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    if (!CYBRID_CLIENT_ID || !CYBRID_CLIENT_SECRET) {
        throw new HTMLStatusError('Cybrid API credentials not configured', 500);
    }

    const response = await fetch(CYBRID_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: CYBRID_CLIENT_ID,
            client_secret: CYBRID_CLIENT_SECRET,
            scope: 'banks:read banks:write customers:read customers:pii:read customers:write customers:execute accounts:read accounts:execute prices:read quotes:execute quotes:read trades:execute trades:read transfers:execute transfers:read transfers:write identity_verifications:read identity_verifications:write identity_verifications:execute',
        }),
    });

    if (!response.ok) {
        throw new HTMLStatusError(`Cybrid auth failed: ${response.status}`, 500);
    }

    const token = (await response.json()) as CybridTokenResponse;
    cachedToken = token.access_token;
    tokenExpiresAt = Date.now() + (token.expires_in - 60) * 1000;
    return cachedToken;
}

async function getConfiguration(): Promise<Configuration> {
    const token = await getAccessToken();
    return new Configuration({
        basePath: CYBRID_API_BASE,
        accessToken: `Bearer ${token}`,
    });
}

async function customersApi(): Promise<CustomersBankApi> {
    return new CustomersBankApi(await getConfiguration());
}

async function accountsApi(): Promise<AccountsBankApi> {
    return new AccountsBankApi(await getConfiguration());
}

async function quotesApi(): Promise<QuotesBankApi> {
    return new QuotesBankApi(await getConfiguration());
}

async function tradesApi(): Promise<TradesBankApi> {
    return new TradesBankApi(await getConfiguration());
}

async function transfersApi(): Promise<TransfersBankApi> {
    return new TransfersBankApi(await getConfiguration());
}

async function identityVerificationsApi(): Promise<IdentityVerificationsBankApi> {
    return new IdentityVerificationsBankApi(await getConfiguration());
}

async function symbolsApi(): Promise<SymbolsBankApi> {
    return new SymbolsBankApi(await getConfiguration());
}

// --- Customers ---

export async function createCustomer(postCustomerBankModel: PostCustomerBankModel): Promise<CustomerBankModel> {
    return firstValueFrom((await customersApi()).createCustomer({ postCustomerBankModel }));
}

export async function getCustomer(customerGuid: string, includePii = false): Promise<CustomerBankModel> {
    return firstValueFrom((await customersApi()).getCustomer({ customerGuid, includePii }));
}

export async function listCustomers(page = 0, perPage = 25): Promise<CustomerListBankModel> {
    return firstValueFrom((await customersApi()).listCustomers({ page, perPage }));
}

// --- Accounts ---

export async function createAccount(postAccountBankModel: PostAccountBankModel): Promise<AccountBankModel> {
    return firstValueFrom((await accountsApi()).createAccount({ postAccountBankModel }));
}

export async function getAccount(accountGuid: string): Promise<AccountBankModel> {
    return firstValueFrom((await accountsApi()).getAccount({ accountGuid }));
}

export async function listAccounts(customerGuid?: string, page = 0, perPage = 25): Promise<AccountListBankModel> {
    return firstValueFrom((await accountsApi()).listAccounts({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

// --- Quotes ---

export async function createQuote(postQuoteBankModel: PostQuoteBankModel): Promise<QuoteBankModel> {
    return firstValueFrom((await quotesApi()).createQuote({ postQuoteBankModel }));
}

export async function getQuote(quoteGuid: string): Promise<QuoteBankModel> {
    return firstValueFrom((await quotesApi()).getQuote({ quoteGuid }));
}

// --- Trades ---

export async function createTrade(postTradeBankModel: PostTradeBankModel): Promise<TradeBankModel> {
    return firstValueFrom((await tradesApi()).createTrade({ postTradeBankModel }));
}

export async function getTrade(tradeGuid: string): Promise<TradeBankModel> {
    return firstValueFrom((await tradesApi()).getTrade({ tradeGuid }));
}

export async function listTrades(customerGuid?: string, page = 0, perPage = 25): Promise<TradeListBankModel> {
    return firstValueFrom((await tradesApi()).listTrades({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

// --- Transfers ---

export async function createTransfer(postTransferBankModel: PostTransferBankModel): Promise<TransferBankModel> {
    return firstValueFrom((await transfersApi()).createTransfer({ postTransferBankModel }));
}

export async function getTransfer(transferGuid: string): Promise<TransferBankModel> {
    return firstValueFrom((await transfersApi()).getTransfer({ transferGuid }));
}

export async function listTransfers(customerGuid?: string, page = 0, perPage = 25): Promise<TransferListBankModel> {
    return firstValueFrom((await transfersApi()).listTransfers({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

// --- Book Transfers (fiat customer-to-customer) ---

export async function createBookTransfer(
    sourceAccountGuid: string,
    destinationAccountGuid: string,
    amount: number,
    asset = 'USD',
): Promise<TransferBankModel> {
    const quote = await createQuote({
        product_type: PostQuoteBankModelProductTypeEnum.BookTransfer,
        asset,
        deliver_amount: amount,
    });

    if (!quote.guid) {
        throw new HTMLStatusError('Quote creation failed: no guid returned', 500);
    }

    return createTransfer({
        quote_guid: quote.guid,
        transfer_type: PostTransferBankModelTransferTypeEnum.Book,
        source_account_guid: sourceAccountGuid,
        destination_account_guid: destinationAccountGuid,
        source_participants: [
            {
                type: PostTransferParticipantBankModelTypeEnum.Customer,
                amount: 0,
                guid: sourceAccountGuid
            }
        ],
        destination_participants: [
            {
                type: PostTransferParticipantBankModelTypeEnum.Customer,
                amount: 0,
                guid: destinationAccountGuid
            }
        ]
    });
}

// --- Identity Verification ---

export async function createIdentityVerification(postIdentityVerificationBankModel: PostIdentityVerificationBankModel): Promise<IdentityVerificationBankModel> {
    return firstValueFrom((await identityVerificationsApi()).createIdentityVerification({ postIdentityVerificationBankModel }));
}

export async function getIdentityVerification(identityVerificationGuid: string): Promise<IdentityVerificationWithDetailsBankModel> {
    return firstValueFrom((await identityVerificationsApi()).getIdentityVerification({ identityVerificationGuid }));
}

// --- Symbols ---

export async function listSymbols(): Promise<Array<string>> {
    return firstValueFrom((await symbolsApi()).listSymbols());
}

// Re-export SDK types for convenience
export type {
    CustomerBankModel,
    CustomerListBankModel,
    PostCustomerBankModel,
    AccountBankModel,
    AccountListBankModel,
    PostAccountBankModel,
    QuoteBankModel,
    QuoteListBankModel,
    PostQuoteBankModel,
    TradeBankModel,
    TradeListBankModel,
    PostTradeBankModel,
    TransferBankModel,
    TransferListBankModel,
    PostTransferBankModel,
    IdentityVerificationBankModel,
    IdentityVerificationListBankModel,
    IdentityVerificationWithDetailsBankModel,
    PostIdentityVerificationBankModel,
};
