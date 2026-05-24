import * as dotenv from 'dotenv';
// @ts-expect-error - xhr2 has no type definitions
import XMLHttpRequest from 'xhr2';
(globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = XMLHttpRequest;
import { firstValueFrom, type Observable } from 'rxjs';
import {
    Configuration,
    CustomersBankApi,
    AccountsBankApi,
    QuotesBankApi,
    TradesBankApi,
    TransfersBankApi,
    IdentityVerificationsBankApi,
    SymbolsBankApi,
    AssetsBankApi,
    PricesBankApi,
    DepositAddressesBankApi,
    DepositBankAccountsBankApi,
    ExternalBankAccountsBankApi,
    ExternalWalletsBankApi,
    WorkflowsBankApi,
    BanksBankApi,
    CounterpartiesBankApi,
    PersonaSessionsBankApi,
    FilesBankApi,
    ExecutionsBankApi,
    InvoicesBankApi,
    PaymentInstructionsBankApi,
    PlansBankApi,
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
    PatchCustomerBankModel,
    PatchTransferBankModel,
    AssetListBankModel,
    SymbolPriceBankModel,
    DepositAddressBankModel,
    DepositAddressListBankModel,
    PostDepositAddressBankModel,
    DepositBankAccountBankModel,
    DepositBankAccountListBankModel,
    PostDepositBankAccountBankModel,
    ExternalBankAccountBankModel,
    ExternalBankAccountListBankModel,
    PatchExternalBankAccountBankModel,
    PostExternalBankAccountBankModel,
    ExternalWalletBankModel,
    ExternalWalletListBankModel,
    PostExternalWalletBankModel,
    PostWorkflowBankModel,
    WorkflowBankModel,
    WorkflowWithDetailsBankModel,
    WorkflowsListBankModel,
    BankBankModel,
    BankListBankModel,
    PatchBankBankModel,
    PostBankBankModel,
    CounterpartyBankModel,
    CounterpartyListBankModel,
    PostCounterpartyBankModel,
    PersonaSessionBankModel,
    PostPersonaSessionBankModel,
    PlatformFileBankModel,
    PlatformFileListBankModel,
    PostFileBankModel,
    ExecutionBankModel,
    ExecutionListBankModel,
    PostExecutionBankModel,
    InvoiceBankModel,
    InvoiceListBankModel,
    PostInvoiceBankModel,
    PaymentInstructionBankModel,
    PaymentInstructionListBankModel,
    PostPaymentInstructionBankModel,
    PlanBankModel,
    PlanListBankModel,
    PostPlanBankModel,
} from '@cybrid/cybrid-api-bank-typescript';
import type { PostTransferParticipantBankModel } from '@cybrid/cybrid-api-bank-typescript';
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
            scope: 'banks:read banks:write customers:read customers:pii:read customers:write customers:execute counterparties:read counterparties:pii:read counterparties:write counterparties:execute accounts:read accounts:execute prices:read quotes:execute quotes:read trades:execute trades:read transfers:execute transfers:read transfers:write identity_verifications:read identity_verifications:write identity_verifications:execute deposit_addresses:read deposit_addresses:execute deposit_bank_accounts:read deposit_bank_accounts:execute external_bank_accounts:read external_bank_accounts:pii:read external_bank_accounts:write external_bank_accounts:execute external_wallets:read external_wallets:execute workflows:read workflows:execute persona_sessions:execute files:read files:pii:read files:execute executions:read executions:execute invoices:read invoices:write invoices:execute plans:read plans:execute',
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

/**
 * Bridges the Cybrid SDK's RxJS observable methods into async/await.
 * Constructs an authenticated client from the cached OAuth configuration,
 * invokes the caller-supplied SDK call, and resolves the first emitted value.
 */
async function callCybridApi<ApiClient, Result>(
    ApiClass: new (config: Configuration) => ApiClient,
    apiCall: (apiClient: ApiClient) => Observable<Result>,
): Promise<Result> {
    return firstValueFrom(apiCall(new ApiClass(await getConfiguration())));
}

// --- Accounts ---

export async function createAccount(postAccountBankModel: PostAccountBankModel): Promise<AccountBankModel> {
    return callCybridApi(AccountsBankApi, (api) => api.createAccount({ postAccountBankModel }));
}

export async function getAccount(accountGuid: string): Promise<AccountBankModel> {
    return callCybridApi(AccountsBankApi, (api) => api.getAccount({ accountGuid }));
}

export async function listAccounts(customerGuid?: string, page = 0, perPage = 25): Promise<AccountListBankModel> {
    return callCybridApi(AccountsBankApi, (api) =>
        api.listAccounts({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- Assets ---

export async function listAssets(page = 0, perPage = 25, code?: string): Promise<AssetListBankModel> {
    return callCybridApi(AssetsBankApi, (api) =>
        api.listAssets({ page, perPage, ...(code ? { code } : {}) }),
    );
}

// --- Banks ---

export async function createBank(postBankBankModel: PostBankBankModel): Promise<BankBankModel> {
    return callCybridApi(BanksBankApi, (api) => api.createBank({ postBankBankModel }));
}

export async function getBank(bankGuid: string): Promise<BankBankModel> {
    return callCybridApi(BanksBankApi, (api) => api.getBank({ bankGuid }));
}

export async function listBanks(page = 0, perPage = 25, type?: string): Promise<BankListBankModel> {
    return callCybridApi(BanksBankApi, (api) =>
        api.listBanks({ page, perPage, ...(type ? { type } : {}) }),
    );
}

export async function updateBank(bankGuid: string, patchBankBankModel: PatchBankBankModel): Promise<BankBankModel> {
    return callCybridApi(BanksBankApi, (api) => api.updateBank({ bankGuid, patchBankBankModel }));
}

// --- Book Transfers (fiat customer-to-customer) ---

export async function createBookTransfer(
    sourceAccountGuid: string,
    destinationAccountGuid: string,
    amount: number,
    asset?: string,
): Promise<TransferBankModel> {
    // The participant `guid` is the *party* (customer/bank) identifier — not the
    // account guid — and book transfers must be like-for-like on asset. Resolve
    // both from the accounts themselves so callers still pass only account guids.
    const [sourceAccount, destinationAccount] = await Promise.all([
        getAccount(sourceAccountGuid),
        getAccount(destinationAccountGuid),
    ]);

    const transferAsset = sourceAccount.asset;
    if (!transferAsset || destinationAccount.asset !== transferAsset) {
        throw new HTMLStatusError('Book transfer requires matching source and destination assets', 400);
    }
    if (asset && asset !== transferAsset) {
        throw new HTMLStatusError('Requested asset does not match the account asset', 400);
    }

    const quote = await createQuote({
        product_type: PostQuoteBankModelProductTypeEnum.BookTransfer,
        asset: transferAsset,
        receive_amount: amount,
    });

    if (!quote.guid) {
        throw new HTMLStatusError('Quote creation failed: no guid returned', 500);
    }

    return createTransfer({
        quote_guid: quote.guid,
        transfer_type: PostTransferBankModelTransferTypeEnum.Book,
        source_account_guid: sourceAccountGuid,
        destination_account_guid: destinationAccountGuid,
        source_participants: [toTransferParticipant(sourceAccount, amount)],
        destination_participants: [toTransferParticipant(destinationAccount, amount)],
    });
}

/**
 * Maps an account to its transfer participant: customer-owned accounts use the
 * customer_guid, bank-owned accounts (fee/reserve/etc.) use the bank_guid.
 */
function toTransferParticipant(account: AccountBankModel, amount: number): PostTransferParticipantBankModel {
    if (account.customer_guid) {
        return { type: PostTransferParticipantBankModelTypeEnum.Customer, amount, guid: account.customer_guid };
    }
    if (account.bank_guid) {
        return { type: PostTransferParticipantBankModelTypeEnum.Bank, amount, guid: account.bank_guid };
    }
    throw new HTMLStatusError('Account has no associated customer or bank', 500);
}

// --- Counterparties ---

export async function createCounterparty(postCounterpartyBankModel: PostCounterpartyBankModel): Promise<CounterpartyBankModel> {
    return callCybridApi(CounterpartiesBankApi, (api) =>
        api.createCounterparty({ postCounterpartyBankModel }),
    );
}

export async function getCounterparty(counterpartyGuid: string, includePii = false): Promise<CounterpartyBankModel> {
    return callCybridApi(CounterpartiesBankApi, (api) =>
        api.getCounterparty({ counterpartyGuid, includePii }),
    );
}

export async function listCounterparties(customerGuid?: string, page = 0, perPage = 25): Promise<CounterpartyListBankModel> {
    return callCybridApi(CounterpartiesBankApi, (api) =>
        api.listCounterparties({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- Customers ---

export async function createCustomer(postCustomerBankModel: PostCustomerBankModel): Promise<CustomerBankModel> {
    return callCybridApi(CustomersBankApi, (api) => api.createCustomer({ postCustomerBankModel }));
}

export async function getCustomer(customerGuid: string, includePii = false): Promise<CustomerBankModel> {
    return callCybridApi(CustomersBankApi, (api) => api.getCustomer({ customerGuid, includePii }));
}

export async function listCustomers(page = 0, perPage = 25): Promise<CustomerListBankModel> {
    return callCybridApi(CustomersBankApi, (api) => api.listCustomers({ page, perPage }));
}

export async function updateCustomer(customerGuid: string, patchCustomerBankModel: PatchCustomerBankModel): Promise<CustomerBankModel> {
    return callCybridApi(CustomersBankApi, (api) =>
        api.updateCustomer({ customerGuid, patchCustomerBankModel }),
    );
}

// --- Deposit Addresses ---

export async function createDepositAddress(postDepositAddressBankModel: PostDepositAddressBankModel): Promise<DepositAddressBankModel> {
    return callCybridApi(DepositAddressesBankApi, (api) =>
        api.createDepositAddress({ postDepositAddressBankModel }),
    );
}

export async function getDepositAddress(depositAddressGuid: string): Promise<DepositAddressBankModel> {
    return callCybridApi(DepositAddressesBankApi, (api) => api.getDepositAddress({ depositAddressGuid }));
}

export async function listDepositAddresses(customerGuid?: string, page = 0, perPage = 25): Promise<DepositAddressListBankModel> {
    return callCybridApi(DepositAddressesBankApi, (api) =>
        api.listDepositAddresses({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- Deposit Bank Accounts ---

export async function createDepositBankAccount(postDepositBankAccountBankModel: PostDepositBankAccountBankModel): Promise<DepositBankAccountBankModel> {
    return callCybridApi(DepositBankAccountsBankApi, (api) =>
        api.createDepositBankAccount({ postDepositBankAccountBankModel }),
    );
}

export async function getDepositBankAccount(depositBankAccountGuid: string): Promise<DepositBankAccountBankModel> {
    return callCybridApi(DepositBankAccountsBankApi, (api) =>
        api.getDepositBankAccount({ depositBankAccountGuid }),
    );
}

export async function listDepositBankAccounts(customerGuid?: string, page = 0, perPage = 25): Promise<DepositBankAccountListBankModel> {
    return callCybridApi(DepositBankAccountsBankApi, (api) =>
        api.listDepositBankAccounts({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- Executions ---

export async function createExecution(postExecutionBankModel: PostExecutionBankModel): Promise<ExecutionBankModel> {
    return callCybridApi(ExecutionsBankApi, (api) => api.createExecution({ postExecutionBankModel }));
}

export async function getExecution(executionGuid: string): Promise<ExecutionBankModel> {
    return callCybridApi(ExecutionsBankApi, (api) => api.getExecution({ executionGuid }));
}

export async function listExecutions(customerGuid?: string, page = 0, perPage = 25): Promise<ExecutionListBankModel> {
    return callCybridApi(ExecutionsBankApi, (api) =>
        api.listExecutions({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- External Bank Accounts ---

export async function createExternalBankAccount(postExternalBankAccountBankModel: PostExternalBankAccountBankModel): Promise<ExternalBankAccountBankModel> {
    return callCybridApi(ExternalBankAccountsBankApi, (api) =>
        api.createExternalBankAccount({ postExternalBankAccountBankModel }),
    );
}

export async function deleteExternalBankAccount(externalBankAccountGuid: string): Promise<ExternalBankAccountBankModel> {
    return callCybridApi(ExternalBankAccountsBankApi, (api) =>
        api.deleteExternalBankAccount({ externalBankAccountGuid }),
    );
}

export async function getExternalBankAccount(
    externalBankAccountGuid: string,
    includeBalances = false,
    forceBalanceRefresh = false,
    includePii = false,
): Promise<ExternalBankAccountBankModel> {
    return callCybridApi(ExternalBankAccountsBankApi, (api) =>
        api.getExternalBankAccount({
            externalBankAccountGuid,
            includeBalances,
            forceBalanceRefresh,
            includePii,
        }),
    );
}

export async function listExternalBankAccounts(customerGuid?: string, page = 0, perPage = 25): Promise<ExternalBankAccountListBankModel> {
    return callCybridApi(ExternalBankAccountsBankApi, (api) =>
        api.listExternalBankAccounts({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

export async function patchExternalBankAccount(
    externalBankAccountGuid: string,
    patchExternalBankAccountBankModel: PatchExternalBankAccountBankModel,
): Promise<ExternalBankAccountBankModel> {
    return callCybridApi(ExternalBankAccountsBankApi, (api) =>
        api.patchExternalBankAccount({
            externalBankAccountGuid,
            patchExternalBankAccountBankModel,
        }),
    );
}

// --- External Wallets ---

export async function createExternalWallet(postExternalWalletBankModel: PostExternalWalletBankModel): Promise<ExternalWalletBankModel> {
    return callCybridApi(ExternalWalletsBankApi, (api) =>
        api.createExternalWallet({ postExternalWalletBankModel }),
    );
}

export async function deleteExternalWallet(externalWalletGuid: string): Promise<ExternalWalletBankModel> {
    return callCybridApi(ExternalWalletsBankApi, (api) =>
        api.deleteExternalWallet({ externalWalletGuid }),
    );
}

export async function getExternalWallet(externalWalletGuid: string): Promise<ExternalWalletBankModel> {
    return callCybridApi(ExternalWalletsBankApi, (api) => api.getExternalWallet({ externalWalletGuid }));
}

export async function listExternalWallets(customerGuid?: string, page = 0, perPage = 25): Promise<ExternalWalletListBankModel> {
    return callCybridApi(ExternalWalletsBankApi, (api) =>
        api.listExternalWallets({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- Files ---

export async function createFile(postFileBankModel: PostFileBankModel): Promise<PlatformFileBankModel> {
    return callCybridApi(FilesBankApi, (api) => api.createFile({ postFileBankModel }));
}

export async function getFile(fileGuid: string, includeDownloadUrl?: string): Promise<PlatformFileBankModel> {
    return callCybridApi(FilesBankApi, (api) =>
        api.getFile({ fileGuid, ...(includeDownloadUrl ? { includeDownloadUrl } : {}) }),
    );
}

export async function listFiles(customerGuid?: string, page = 0, perPage = 25): Promise<PlatformFileListBankModel> {
    return callCybridApi(FilesBankApi, (api) =>
        api.listFiles({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- Identity Verification ---

export async function createIdentityVerification(postIdentityVerificationBankModel: PostIdentityVerificationBankModel): Promise<IdentityVerificationBankModel> {
    return callCybridApi(IdentityVerificationsBankApi, (api) =>
        api.createIdentityVerification({ postIdentityVerificationBankModel }),
    );
}

export async function getIdentityVerification(identityVerificationGuid: string): Promise<IdentityVerificationWithDetailsBankModel> {
    return callCybridApi(IdentityVerificationsBankApi, (api) =>
        api.getIdentityVerification({ identityVerificationGuid }),
    );
}

export async function listIdentityVerifications(customerGuid?: string, page = 0, perPage = 25): Promise<IdentityVerificationListBankModel> {
    return callCybridApi(IdentityVerificationsBankApi, (api) =>
        api.listIdentityVerifications({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- Invoices ---

export async function cancelInvoice(invoiceGuid: string): Promise<InvoiceBankModel> {
    return callCybridApi(InvoicesBankApi, (api) => api.cancelInvoice({ invoiceGuid }));
}

export async function createInvoice(postInvoiceBankModel: PostInvoiceBankModel): Promise<InvoiceBankModel> {
    return callCybridApi(InvoicesBankApi, (api) => api.createInvoice({ postInvoiceBankModel }));
}

export async function getInvoice(invoiceGuid: string): Promise<InvoiceBankModel> {
    return callCybridApi(InvoicesBankApi, (api) => api.getInvoice({ invoiceGuid }));
}

export async function listInvoices(customerGuid?: string, page = 0, perPage = 25): Promise<InvoiceListBankModel> {
    return callCybridApi(InvoicesBankApi, (api) =>
        api.listInvoices({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- Payment Instructions ---

export async function createPaymentInstruction(postPaymentInstructionBankModel: PostPaymentInstructionBankModel): Promise<PaymentInstructionBankModel> {
    return callCybridApi(PaymentInstructionsBankApi, (api) =>
        api.createPaymentInstruction({ postPaymentInstructionBankModel }),
    );
}

export async function getPaymentInstruction(paymentInstructionGuid: string): Promise<PaymentInstructionBankModel> {
    return callCybridApi(PaymentInstructionsBankApi, (api) =>
        api.getPaymentInstruction({ paymentInstructionGuid }),
    );
}

export async function listPaymentInstructions(
    customerGuid?: string,
    invoiceGuid?: string,
    page = 0,
    perPage = 25,
): Promise<PaymentInstructionListBankModel> {
    return callCybridApi(PaymentInstructionsBankApi, (api) =>
        api.listPaymentInstructions({
            page,
            perPage,
            ...(customerGuid ? { customerGuid } : {}),
            ...(invoiceGuid ? { invoiceGuid } : {}),
        }),
    );
}

// --- Persona Sessions ---

export async function createPersonaSession(postPersonaSessionBankModel: PostPersonaSessionBankModel): Promise<PersonaSessionBankModel> {
    return callCybridApi(PersonaSessionsBankApi, (api) =>
        api.createPersonaSession({ postPersonaSessionBankModel }),
    );
}

// --- Plans ---

export async function createPlan(postPlanBankModel: PostPlanBankModel): Promise<PlanBankModel> {
    return callCybridApi(PlansBankApi, (api) => api.createPlan({ postPlanBankModel }));
}

export async function getPlan(planGuid: string): Promise<PlanBankModel> {
    return callCybridApi(PlansBankApi, (api) => api.getPlan({ planGuid }));
}

export async function listPlans(customerGuid?: string, page = 0, perPage = 25): Promise<PlanListBankModel> {
    return callCybridApi(PlansBankApi, (api) =>
        api.listPlans({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- Prices ---

export async function listPrices(symbol?: string): Promise<Array<SymbolPriceBankModel>> {
    return callCybridApi(PricesBankApi, (api) => api.listPrices({ ...(symbol ? { symbol } : {}) }));
}

// --- Quotes ---

export async function createQuote(postQuoteBankModel: PostQuoteBankModel): Promise<QuoteBankModel> {
    return callCybridApi(QuotesBankApi, (api) => api.createQuote({ postQuoteBankModel }));
}

export async function getQuote(quoteGuid: string): Promise<QuoteBankModel> {
    return callCybridApi(QuotesBankApi, (api) => api.getQuote({ quoteGuid }));
}

export async function listQuotes(customerGuid?: string, page = 0, perPage = 25): Promise<QuoteListBankModel> {
    return callCybridApi(QuotesBankApi, (api) =>
        api.listQuotes({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- Symbols ---

export async function listSymbols(): Promise<Array<string>> {
    return callCybridApi(SymbolsBankApi, (api) => api.listSymbols());
}

// --- Trades ---

export async function createTrade(postTradeBankModel: PostTradeBankModel): Promise<TradeBankModel> {
    return callCybridApi(TradesBankApi, (api) => api.createTrade({ postTradeBankModel }));
}

export async function getTrade(tradeGuid: string): Promise<TradeBankModel> {
    return callCybridApi(TradesBankApi, (api) => api.getTrade({ tradeGuid }));
}

export async function listTrades(customerGuid?: string, page = 0, perPage = 25): Promise<TradeListBankModel> {
    return callCybridApi(TradesBankApi, (api) =>
        api.listTrades({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

// --- Transfers ---

export async function createTransfer(postTransferBankModel: PostTransferBankModel): Promise<TransferBankModel> {
    return callCybridApi(TransfersBankApi, (api) => api.createTransfer({ postTransferBankModel }));
}

export async function getTransfer(transferGuid: string): Promise<TransferBankModel> {
    return callCybridApi(TransfersBankApi, (api) => api.getTransfer({ transferGuid }));
}

export async function listTransfers(customerGuid?: string, page = 0, perPage = 25): Promise<TransferListBankModel> {
    return callCybridApi(TransfersBankApi, (api) =>
        api.listTransfers({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
}

export async function updateTransfer(transferGuid: string, patchTransferBankModel: PatchTransferBankModel): Promise<TransferBankModel> {
    return callCybridApi(TransfersBankApi, (api) =>
        api.updateTransfer({ transferGuid, patchTransferBankModel }),
    );
}

// --- Workflows ---

export async function createWorkflow(postWorkflowBankModel: PostWorkflowBankModel): Promise<WorkflowBankModel> {
    return callCybridApi(WorkflowsBankApi, (api) => api.createWorkflow({ postWorkflowBankModel }));
}

export async function getWorkflow(workflowGuid: string): Promise<WorkflowWithDetailsBankModel> {
    return callCybridApi(WorkflowsBankApi, (api) => api.getWorkflow({ workflowGuid }));
}

export async function listWorkflows(customerGuid?: string, page = 0, perPage = 25): Promise<WorkflowsListBankModel> {
    return callCybridApi(WorkflowsBankApi, (api) =>
        api.listWorkflows({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }),
    );
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
    PatchCustomerBankModel,
    PatchTransferBankModel,
    AssetListBankModel,
    SymbolPriceBankModel,
    DepositAddressBankModel,
    DepositAddressListBankModel,
    PostDepositAddressBankModel,
    DepositBankAccountBankModel,
    DepositBankAccountListBankModel,
    PostDepositBankAccountBankModel,
    ExternalBankAccountBankModel,
    ExternalBankAccountListBankModel,
    PatchExternalBankAccountBankModel,
    PostExternalBankAccountBankModel,
    ExternalWalletBankModel,
    ExternalWalletListBankModel,
    PostExternalWalletBankModel,
    PostWorkflowBankModel,
    WorkflowBankModel,
    WorkflowWithDetailsBankModel,
    WorkflowsListBankModel,
    BankBankModel,
    BankListBankModel,
    PatchBankBankModel,
    PostBankBankModel,
    CounterpartyBankModel,
    CounterpartyListBankModel,
    PostCounterpartyBankModel,
    PersonaSessionBankModel,
    PostPersonaSessionBankModel,
    PlatformFileBankModel,
    PlatformFileListBankModel,
    PostFileBankModel,
    ExecutionBankModel,
    ExecutionListBankModel,
    PostExecutionBankModel,
    InvoiceBankModel,
    InvoiceListBankModel,
    PostInvoiceBankModel,
    PaymentInstructionBankModel,
    PaymentInstructionListBankModel,
    PostPaymentInstructionBankModel,
    PlanBankModel,
    PlanListBankModel,
    PostPlanBankModel,
};
