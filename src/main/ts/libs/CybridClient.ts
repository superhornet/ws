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
            scope: 'banks:read banks:write banks:execute customers:read customers:pii:read customers:write customers:execute counterparties:read counterparties:pii:read counterparties:write counterparties:execute accounts:read accounts:execute prices:read quotes:execute quotes:read trades:execute trades:read transfers:execute transfers:read transfers:write identity_verifications:read identity_verifications:write identity_verifications:execute deposit_addresses:read deposit_addresses:execute deposit_bank_accounts:read deposit_bank_accounts:execute external_bank_accounts:read external_bank_accounts:pii:read external_bank_accounts:write external_bank_accounts:execute external_wallets:read external_wallets:execute workflows:read workflows:execute persona_sessions:execute files:read files:pii:read files:execute executions:read executions:execute invoices:read invoices:write invoices:execute plans:read plans:execute',
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

async function assetsApi(): Promise<AssetsBankApi> {
    return new AssetsBankApi(await getConfiguration());
}

async function pricesApi(): Promise<PricesBankApi> {
    return new PricesBankApi(await getConfiguration());
}

async function depositAddressesApi(): Promise<DepositAddressesBankApi> {
    return new DepositAddressesBankApi(await getConfiguration());
}

async function depositBankAccountsApi(): Promise<DepositBankAccountsBankApi> {
    return new DepositBankAccountsBankApi(await getConfiguration());
}

async function externalBankAccountsApi(): Promise<ExternalBankAccountsBankApi> {
    return new ExternalBankAccountsBankApi(await getConfiguration());
}

async function externalWalletsApi(): Promise<ExternalWalletsBankApi> {
    return new ExternalWalletsBankApi(await getConfiguration());
}

async function workflowsApi(): Promise<WorkflowsBankApi> {
    return new WorkflowsBankApi(await getConfiguration());
}

async function banksApi(): Promise<BanksBankApi> {
    return new BanksBankApi(await getConfiguration());
}

async function counterpartiesApi(): Promise<CounterpartiesBankApi> {
    return new CounterpartiesBankApi(await getConfiguration());
}

async function personaSessionsApi(): Promise<PersonaSessionsBankApi> {
    return new PersonaSessionsBankApi(await getConfiguration());
}

async function filesApi(): Promise<FilesBankApi> {
    return new FilesBankApi(await getConfiguration());
}

async function executionsApi(): Promise<ExecutionsBankApi> {
    return new ExecutionsBankApi(await getConfiguration());
}

async function invoicesApi(): Promise<InvoicesBankApi> {
    return new InvoicesBankApi(await getConfiguration());
}

async function paymentInstructionsApi(): Promise<PaymentInstructionsBankApi> {
    return new PaymentInstructionsBankApi(await getConfiguration());
}

async function plansApi(): Promise<PlansBankApi> {
    return new PlansBankApi(await getConfiguration());
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

export async function updateCustomer(customerGuid: string, patchCustomerBankModel: PatchCustomerBankModel): Promise<CustomerBankModel> {
    return firstValueFrom((await customersApi()).updateCustomer({ customerGuid, patchCustomerBankModel }));
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

export async function listQuotes(customerGuid?: string, page = 0, perPage = 25): Promise<QuoteListBankModel> {
    return firstValueFrom((await quotesApi()).listQuotes({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
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

export async function updateTransfer(transferGuid: string, patchTransferBankModel: PatchTransferBankModel): Promise<TransferBankModel> {
    return firstValueFrom((await transfersApi()).updateTransfer({ transferGuid, patchTransferBankModel }));
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

export async function listIdentityVerifications(customerGuid?: string, page = 0, perPage = 25): Promise<IdentityVerificationListBankModel> {
    return firstValueFrom((await identityVerificationsApi()).listIdentityVerifications({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

// --- Symbols ---

export async function listSymbols(): Promise<Array<string>> {
    return firstValueFrom((await symbolsApi()).listSymbols());
}

// --- Assets ---

export async function listAssets(page = 0, perPage = 25, code?: string): Promise<AssetListBankModel> {
    return firstValueFrom((await assetsApi()).listAssets({ page, perPage, ...(code ? { code } : {}) }));
}

// --- Prices ---

export async function listPrices(symbol?: string): Promise<Array<SymbolPriceBankModel>> {
    return firstValueFrom((await pricesApi()).listPrices({ ...(symbol ? { symbol } : {}) }));
}

// --- Deposit Addresses ---

export async function createDepositAddress(postDepositAddressBankModel: PostDepositAddressBankModel): Promise<DepositAddressBankModel> {
    return firstValueFrom((await depositAddressesApi()).createDepositAddress({ postDepositAddressBankModel }));
}

export async function getDepositAddress(depositAddressGuid: string): Promise<DepositAddressBankModel> {
    return firstValueFrom((await depositAddressesApi()).getDepositAddress({ depositAddressGuid }));
}

export async function listDepositAddresses(customerGuid?: string, page = 0, perPage = 25): Promise<DepositAddressListBankModel> {
    return firstValueFrom((await depositAddressesApi()).listDepositAddresses({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

// --- Deposit Bank Accounts ---

export async function createDepositBankAccount(postDepositBankAccountBankModel: PostDepositBankAccountBankModel): Promise<DepositBankAccountBankModel> {
    return firstValueFrom((await depositBankAccountsApi()).createDepositBankAccount({ postDepositBankAccountBankModel }));
}

export async function getDepositBankAccount(depositBankAccountGuid: string): Promise<DepositBankAccountBankModel> {
    return firstValueFrom((await depositBankAccountsApi()).getDepositBankAccount({ depositBankAccountGuid }));
}

export async function listDepositBankAccounts(customerGuid?: string, page = 0, perPage = 25): Promise<DepositBankAccountListBankModel> {
    return firstValueFrom((await depositBankAccountsApi()).listDepositBankAccounts({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

// --- External Bank Accounts ---

export async function createExternalBankAccount(postExternalBankAccountBankModel: PostExternalBankAccountBankModel): Promise<ExternalBankAccountBankModel> {
    return firstValueFrom((await externalBankAccountsApi()).createExternalBankAccount({ postExternalBankAccountBankModel }));
}

export async function getExternalBankAccount(
    externalBankAccountGuid: string,
    includeBalances = false,
    forceBalanceRefresh = false,
    includePii = false,
): Promise<ExternalBankAccountBankModel> {
    return firstValueFrom((await externalBankAccountsApi()).getExternalBankAccount({
        externalBankAccountGuid,
        includeBalances,
        forceBalanceRefresh,
        includePii,
    }));
}

export async function listExternalBankAccounts(customerGuid?: string, page = 0, perPage = 25): Promise<ExternalBankAccountListBankModel> {
    return firstValueFrom((await externalBankAccountsApi()).listExternalBankAccounts({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

export async function patchExternalBankAccount(
    externalBankAccountGuid: string,
    patchExternalBankAccountBankModel: PatchExternalBankAccountBankModel,
): Promise<ExternalBankAccountBankModel> {
    return firstValueFrom((await externalBankAccountsApi()).patchExternalBankAccount({
        externalBankAccountGuid,
        patchExternalBankAccountBankModel,
    }));
}

export async function deleteExternalBankAccount(externalBankAccountGuid: string): Promise<ExternalBankAccountBankModel> {
    return firstValueFrom((await externalBankAccountsApi()).deleteExternalBankAccount({ externalBankAccountGuid }));
}

// --- External Wallets ---

export async function createExternalWallet(postExternalWalletBankModel: PostExternalWalletBankModel): Promise<ExternalWalletBankModel> {
    return firstValueFrom((await externalWalletsApi()).createExternalWallet({ postExternalWalletBankModel }));
}

export async function getExternalWallet(externalWalletGuid: string): Promise<ExternalWalletBankModel> {
    return firstValueFrom((await externalWalletsApi()).getExternalWallet({ externalWalletGuid }));
}

export async function listExternalWallets(customerGuid?: string, page = 0, perPage = 25): Promise<ExternalWalletListBankModel> {
    return firstValueFrom((await externalWalletsApi()).listExternalWallets({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

export async function deleteExternalWallet(externalWalletGuid: string): Promise<ExternalWalletBankModel> {
    return firstValueFrom((await externalWalletsApi()).deleteExternalWallet({ externalWalletGuid }));
}

// --- Workflows ---

export async function createWorkflow(postWorkflowBankModel: PostWorkflowBankModel): Promise<WorkflowBankModel> {
    return firstValueFrom((await workflowsApi()).createWorkflow({ postWorkflowBankModel }));
}

export async function getWorkflow(workflowGuid: string): Promise<WorkflowWithDetailsBankModel> {
    return firstValueFrom((await workflowsApi()).getWorkflow({ workflowGuid }));
}

export async function listWorkflows(customerGuid?: string, page = 0, perPage = 25): Promise<WorkflowsListBankModel> {
    return firstValueFrom((await workflowsApi()).listWorkflows({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

// --- Banks ---

export async function createBank(postBankBankModel: PostBankBankModel): Promise<BankBankModel> {
    return firstValueFrom((await banksApi()).createBank({ postBankBankModel }));
}

export async function getBank(bankGuid: string): Promise<BankBankModel> {
    return firstValueFrom((await banksApi()).getBank({ bankGuid }));
}

export async function listBanks(page = 0, perPage = 25, type?: string): Promise<BankListBankModel> {
    return firstValueFrom((await banksApi()).listBanks({ page, perPage, ...(type ? { type } : {}) }));
}

export async function updateBank(bankGuid: string, patchBankBankModel: PatchBankBankModel): Promise<BankBankModel> {
    return firstValueFrom((await banksApi()).updateBank({ bankGuid, patchBankBankModel }));
}

// --- Counterparties ---

export async function createCounterparty(postCounterpartyBankModel: PostCounterpartyBankModel): Promise<CounterpartyBankModel> {
    return firstValueFrom((await counterpartiesApi()).createCounterparty({ postCounterpartyBankModel }));
}

export async function getCounterparty(counterpartyGuid: string, includePii = false): Promise<CounterpartyBankModel> {
    return firstValueFrom((await counterpartiesApi()).getCounterparty({ counterpartyGuid, includePii }));
}

export async function listCounterparties(customerGuid?: string, page = 0, perPage = 25): Promise<CounterpartyListBankModel> {
    return firstValueFrom((await counterpartiesApi()).listCounterparties({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

// --- Persona Sessions ---

export async function createPersonaSession(postPersonaSessionBankModel: PostPersonaSessionBankModel): Promise<PersonaSessionBankModel> {
    return firstValueFrom((await personaSessionsApi()).createPersonaSession({ postPersonaSessionBankModel }));
}

// --- Files ---

export async function createFile(postFileBankModel: PostFileBankModel): Promise<PlatformFileBankModel> {
    return firstValueFrom((await filesApi()).createFile({ postFileBankModel }));
}

export async function getFile(fileGuid: string, includeDownloadUrl?: string): Promise<PlatformFileBankModel> {
    return firstValueFrom((await filesApi()).getFile({ fileGuid, ...(includeDownloadUrl ? { includeDownloadUrl } : {}) }));
}

export async function listFiles(customerGuid?: string, page = 0, perPage = 25): Promise<PlatformFileListBankModel> {
    return firstValueFrom((await filesApi()).listFiles({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

// --- Executions ---

export async function createExecution(postExecutionBankModel: PostExecutionBankModel): Promise<ExecutionBankModel> {
    return firstValueFrom((await executionsApi()).createExecution({ postExecutionBankModel }));
}

export async function getExecution(executionGuid: string): Promise<ExecutionBankModel> {
    return firstValueFrom((await executionsApi()).getExecution({ executionGuid }));
}

export async function listExecutions(customerGuid?: string, page = 0, perPage = 25): Promise<ExecutionListBankModel> {
    return firstValueFrom((await executionsApi()).listExecutions({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

// --- Invoices ---

export async function createInvoice(postInvoiceBankModel: PostInvoiceBankModel): Promise<InvoiceBankModel> {
    return firstValueFrom((await invoicesApi()).createInvoice({ postInvoiceBankModel }));
}

export async function getInvoice(invoiceGuid: string): Promise<InvoiceBankModel> {
    return firstValueFrom((await invoicesApi()).getInvoice({ invoiceGuid }));
}

export async function listInvoices(customerGuid?: string, page = 0, perPage = 25): Promise<InvoiceListBankModel> {
    return firstValueFrom((await invoicesApi()).listInvoices({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
}

export async function cancelInvoice(invoiceGuid: string): Promise<InvoiceBankModel> {
    return firstValueFrom((await invoicesApi()).cancelInvoice({ invoiceGuid }));
}

// --- Payment Instructions ---

export async function createPaymentInstruction(postPaymentInstructionBankModel: PostPaymentInstructionBankModel): Promise<PaymentInstructionBankModel> {
    return firstValueFrom((await paymentInstructionsApi()).createPaymentInstruction({ postPaymentInstructionBankModel }));
}

export async function getPaymentInstruction(paymentInstructionGuid: string): Promise<PaymentInstructionBankModel> {
    return firstValueFrom((await paymentInstructionsApi()).getPaymentInstruction({ paymentInstructionGuid }));
}

export async function listPaymentInstructions(
    customerGuid?: string,
    invoiceGuid?: string,
    page = 0,
    perPage = 25,
): Promise<PaymentInstructionListBankModel> {
    return firstValueFrom((await paymentInstructionsApi()).listPaymentInstructions({
        page,
        perPage,
        ...(customerGuid ? { customerGuid } : {}),
        ...(invoiceGuid ? { invoiceGuid } : {}),
    }));
}

// --- Plans ---

export async function createPlan(postPlanBankModel: PostPlanBankModel): Promise<PlanBankModel> {
    return firstValueFrom((await plansApi()).createPlan({ postPlanBankModel }));
}

export async function getPlan(planGuid: string): Promise<PlanBankModel> {
    return firstValueFrom((await plansApi()).getPlan({ planGuid }));
}

export async function listPlans(customerGuid?: string, page = 0, perPage = 25): Promise<PlanListBankModel> {
    return firstValueFrom((await plansApi()).listPlans({ page, perPage, ...(customerGuid ? { customerGuid } : {}) }));
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
