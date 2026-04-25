import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
import { toHttpError, requireGuid } from "../libs/httpErrorWrap.ts";
import * as CybridClient from "../libs/CybridClient.ts";
import type {
    CustomerBankModel,
    CustomerListBankModel,
    PostCustomerBankModel,
    AccountBankModel,
    AccountListBankModel,
    PostAccountBankModel,
    QuoteBankModel,
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
    QuoteListBankModel,
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
} from "../libs/CybridClient.ts";

export class Cybrid {

    // --- Customers ---

    static createCustomer(data: PostCustomerBankModel): Promise<CustomerBankModel> {
        return toHttpError(() => CybridClient.createCustomer(data));
    }

    static getCustomer(customerGuid: string, includePii = false): Promise<CustomerBankModel> {
        return toHttpError(() => {
            requireGuid(customerGuid, "Customer");
            return CybridClient.getCustomer(customerGuid, includePii);
        });
    }

    static listCustomers(page?: number, perPage?: number): Promise<CustomerListBankModel> {
        return toHttpError(() => CybridClient.listCustomers(page, perPage));
    }

    static updateCustomer(customerGuid: string, data: PatchCustomerBankModel): Promise<CustomerBankModel> {
        return toHttpError(() => {
            requireGuid(customerGuid, "Customer");
            return CybridClient.updateCustomer(customerGuid, data);
        });
    }

    // --- Accounts ---

    static createAccount(data: PostAccountBankModel): Promise<AccountBankModel> {
        return toHttpError(() => CybridClient.createAccount(data));
    }

    static getAccount(accountGuid: string): Promise<AccountBankModel> {
        return toHttpError(() => {
            requireGuid(accountGuid, "Account");
            return CybridClient.getAccount(accountGuid);
        });
    }

    static listAccounts(customerGuid?: string, page?: number, perPage?: number): Promise<AccountListBankModel> {
        return toHttpError(() => CybridClient.listAccounts(customerGuid, page, perPage));
    }

    // --- Quotes ---

    static createQuote(data: PostQuoteBankModel): Promise<QuoteBankModel> {
        return toHttpError(() => CybridClient.createQuote(data));
    }

    static getQuote(quoteGuid: string): Promise<QuoteBankModel> {
        return toHttpError(() => {
            requireGuid(quoteGuid, "Quote");
            return CybridClient.getQuote(quoteGuid);
        });
    }

    static listQuotes(customerGuid?: string, page?: number, perPage?: number): Promise<QuoteListBankModel> {
        return toHttpError(() => CybridClient.listQuotes(customerGuid, page, perPage));
    }

    // --- Trades ---

    static createTrade(data: PostTradeBankModel): Promise<TradeBankModel> {
        return toHttpError(() => CybridClient.createTrade(data));
    }

    static getTrade(tradeGuid: string): Promise<TradeBankModel> {
        return toHttpError(() => {
            requireGuid(tradeGuid, "Trade");
            return CybridClient.getTrade(tradeGuid);
        });
    }

    static listTrades(customerGuid?: string, page?: number, perPage?: number): Promise<TradeListBankModel> {
        return toHttpError(() => CybridClient.listTrades(customerGuid, page, perPage));
    }

    // --- Transfers ---

    static createTransfer(data: PostTransferBankModel): Promise<TransferBankModel> {
        return toHttpError(() => CybridClient.createTransfer(data));
    }

    static getTransfer(transferGuid: string): Promise<TransferBankModel> {
        return toHttpError(() => {
            requireGuid(transferGuid, "Transfer");
            return CybridClient.getTransfer(transferGuid);
        });
    }

    static listTransfers(customerGuid?: string, page?: number, perPage?: number): Promise<TransferListBankModel> {
        return toHttpError(() => CybridClient.listTransfers(customerGuid, page, perPage));
    }

    static updateTransfer(transferGuid: string, data: PatchTransferBankModel): Promise<TransferBankModel> {
        return toHttpError(() => {
            requireGuid(transferGuid, "Transfer");
            return CybridClient.updateTransfer(transferGuid, data);
        });
    }

    // --- Book Transfers (fiat customer-to-customer) ---

    static transferFiat(
        sourceAccountGuid: string,
        destinationAccountGuid: string,
        amount: number,
        asset?: string,
    ): Promise<TransferBankModel> {
        return toHttpError(() => {
            requireGuid(sourceAccountGuid, "Source account");
            requireGuid(destinationAccountGuid, "Destination account");

            if (!amount || amount <= 0) {
                throw new HTMLStatusError("Amount must be a positive number", 400);
            }
            if (!Number.isInteger(amount) || !Number.isSafeInteger(amount)) {
                throw new HTMLStatusError("Amount must be a safe integer (in cents)", 400);
            }
            if (amount > 5_000_00) {
                throw new HTMLStatusError("Amount exceeds maximum transfer limit of $5,000", 400);
            }
            return CybridClient.createBookTransfer(sourceAccountGuid, destinationAccountGuid, amount, asset);
        });
    }

    // --- Identity Verification ---

    static createIdentityVerification(data: PostIdentityVerificationBankModel): Promise<IdentityVerificationBankModel> {
        return toHttpError(() => CybridClient.createIdentityVerification(data));
    }

    static getIdentityVerification(verificationGuid: string): Promise<IdentityVerificationWithDetailsBankModel> {
        return toHttpError(() => {
            requireGuid(verificationGuid, "Verification");
            return CybridClient.getIdentityVerification(verificationGuid);
        });
    }

    static listIdentityVerifications(customerGuid?: string, page?: number, perPage?: number): Promise<IdentityVerificationListBankModel> {
        return toHttpError(() => CybridClient.listIdentityVerifications(customerGuid, page, perPage));
    }

    // --- Symbols ---

    static listSymbols(): Promise<Array<string>> {
        return toHttpError(() => CybridClient.listSymbols());
    }

    // --- Assets ---

    static listAssets(page?: number, perPage?: number, code?: string): Promise<AssetListBankModel> {
        return toHttpError(() => CybridClient.listAssets(page, perPage, code));
    }

    // --- Prices ---

    static listPrices(symbol?: string): Promise<Array<SymbolPriceBankModel>> {
        return toHttpError(() => CybridClient.listPrices(symbol));
    }

    // --- Deposit Addresses ---

    static createDepositAddress(data: PostDepositAddressBankModel): Promise<DepositAddressBankModel> {
        return toHttpError(() => CybridClient.createDepositAddress(data));
    }

    static getDepositAddress(depositAddressGuid: string): Promise<DepositAddressBankModel> {
        return toHttpError(() => {
            requireGuid(depositAddressGuid, "Deposit Address");
            return CybridClient.getDepositAddress(depositAddressGuid);
        });
    }

    static listDepositAddresses(customerGuid?: string, page?: number, perPage?: number): Promise<DepositAddressListBankModel> {
        return toHttpError(() => CybridClient.listDepositAddresses(customerGuid, page, perPage));
    }

    // --- Deposit Bank Accounts ---

    static createDepositBankAccount(data: PostDepositBankAccountBankModel): Promise<DepositBankAccountBankModel> {
        return toHttpError(() => CybridClient.createDepositBankAccount(data));
    }

    static getDepositBankAccount(depositBankAccountGuid: string): Promise<DepositBankAccountBankModel> {
        return toHttpError(() => {
            requireGuid(depositBankAccountGuid, "Deposit Bank Account");
            return CybridClient.getDepositBankAccount(depositBankAccountGuid);
        });
    }

    static listDepositBankAccounts(customerGuid?: string, page?: number, perPage?: number): Promise<DepositBankAccountListBankModel> {
        return toHttpError(() => CybridClient.listDepositBankAccounts(customerGuid, page, perPage));
    }

    // --- External Bank Accounts ---

    static createExternalBankAccount(data: PostExternalBankAccountBankModel): Promise<ExternalBankAccountBankModel> {
        return toHttpError(() => CybridClient.createExternalBankAccount(data));
    }

    static getExternalBankAccount(
        externalBankAccountGuid: string,
        includeBalances = false,
        forceBalanceRefresh = false,
        includePii = false,
    ): Promise<ExternalBankAccountBankModel> {
        return toHttpError(() => {
            requireGuid(externalBankAccountGuid, "External Bank Account");
            return CybridClient.getExternalBankAccount(externalBankAccountGuid, includeBalances, forceBalanceRefresh, includePii);
        });
    }

    static listExternalBankAccounts(customerGuid?: string, page?: number, perPage?: number): Promise<ExternalBankAccountListBankModel> {
        return toHttpError(() => CybridClient.listExternalBankAccounts(customerGuid, page, perPage));
    }

    static patchExternalBankAccount(
        externalBankAccountGuid: string,
        data: PatchExternalBankAccountBankModel,
    ): Promise<ExternalBankAccountBankModel> {
        return toHttpError(() => {
            requireGuid(externalBankAccountGuid, "External Bank Account");
            return CybridClient.patchExternalBankAccount(externalBankAccountGuid, data);
        });
    }

    static deleteExternalBankAccount(externalBankAccountGuid: string): Promise<ExternalBankAccountBankModel> {
        return toHttpError(() => {
            requireGuid(externalBankAccountGuid, "External Bank Account");
            return CybridClient.deleteExternalBankAccount(externalBankAccountGuid);
        });
    }

    // --- External Wallets ---

    static createExternalWallet(data: PostExternalWalletBankModel): Promise<ExternalWalletBankModel> {
        return toHttpError(() => CybridClient.createExternalWallet(data));
    }

    static getExternalWallet(externalWalletGuid: string): Promise<ExternalWalletBankModel> {
        return toHttpError(() => {
            requireGuid(externalWalletGuid, "External Wallet");
            return CybridClient.getExternalWallet(externalWalletGuid);
        });
    }

    static listExternalWallets(customerGuid?: string, page?: number, perPage?: number): Promise<ExternalWalletListBankModel> {
        return toHttpError(() => CybridClient.listExternalWallets(customerGuid, page, perPage));
    }

    static deleteExternalWallet(externalWalletGuid: string): Promise<ExternalWalletBankModel> {
        return toHttpError(() => {
            requireGuid(externalWalletGuid, "External Wallet");
            return CybridClient.deleteExternalWallet(externalWalletGuid);
        });
    }

    // --- Workflows ---

    static createWorkflow(data: PostWorkflowBankModel): Promise<WorkflowBankModel> {
        return toHttpError(() => CybridClient.createWorkflow(data));
    }

    static getWorkflow(workflowGuid: string): Promise<WorkflowWithDetailsBankModel> {
        return toHttpError(() => {
            requireGuid(workflowGuid, "Workflow");
            return CybridClient.getWorkflow(workflowGuid);
        });
    }

    static listWorkflows(customerGuid?: string, page?: number, perPage?: number): Promise<WorkflowsListBankModel> {
        return toHttpError(() => CybridClient.listWorkflows(customerGuid, page, perPage));
    }

    // --- Banks ---

    static createBank(data: PostBankBankModel): Promise<BankBankModel> {
        return toHttpError(() => CybridClient.createBank(data));
    }

    static getBank(bankGuid: string): Promise<BankBankModel> {
        return toHttpError(() => {
            requireGuid(bankGuid, "Bank");
            return CybridClient.getBank(bankGuid);
        });
    }

    static listBanks(page?: number, perPage?: number, type?: string): Promise<BankListBankModel> {
        return toHttpError(() => CybridClient.listBanks(page, perPage, type));
    }

    static updateBank(bankGuid: string, data: PatchBankBankModel): Promise<BankBankModel> {
        return toHttpError(() => {
            requireGuid(bankGuid, "Bank");
            return CybridClient.updateBank(bankGuid, data);
        });
    }

    // --- Counterparties ---

    static createCounterparty(data: PostCounterpartyBankModel): Promise<CounterpartyBankModel> {
        return toHttpError(() => CybridClient.createCounterparty(data));
    }

    static getCounterparty(counterpartyGuid: string, includePii = false): Promise<CounterpartyBankModel> {
        return toHttpError(() => {
            requireGuid(counterpartyGuid, "Counterparty");
            return CybridClient.getCounterparty(counterpartyGuid, includePii);
        });
    }

    static listCounterparties(customerGuid?: string, page?: number, perPage?: number): Promise<CounterpartyListBankModel> {
        return toHttpError(() => CybridClient.listCounterparties(customerGuid, page, perPage));
    }

    // --- Persona Sessions ---

    static createPersonaSession(data: PostPersonaSessionBankModel): Promise<PersonaSessionBankModel> {
        return toHttpError(() => CybridClient.createPersonaSession(data));
    }

    // --- Files ---

    static createFile(data: PostFileBankModel): Promise<PlatformFileBankModel> {
        return toHttpError(() => CybridClient.createFile(data));
    }

    static getFile(fileGuid: string, includeDownloadUrl?: string): Promise<PlatformFileBankModel> {
        return toHttpError(() => {
            requireGuid(fileGuid, "File");
            return CybridClient.getFile(fileGuid, includeDownloadUrl);
        });
    }

    static listFiles(customerGuid?: string, page?: number, perPage?: number): Promise<PlatformFileListBankModel> {
        return toHttpError(() => CybridClient.listFiles(customerGuid, page, perPage));
    }

    // --- Executions ---

    static createExecution(data: PostExecutionBankModel): Promise<ExecutionBankModel> {
        return toHttpError(() => CybridClient.createExecution(data));
    }

    static getExecution(executionGuid: string): Promise<ExecutionBankModel> {
        return toHttpError(() => {
            requireGuid(executionGuid, "Execution");
            return CybridClient.getExecution(executionGuid);
        });
    }

    static listExecutions(customerGuid?: string, page?: number, perPage?: number): Promise<ExecutionListBankModel> {
        return toHttpError(() => CybridClient.listExecutions(customerGuid, page, perPage));
    }

    // --- Invoices ---

    static createInvoice(data: PostInvoiceBankModel): Promise<InvoiceBankModel> {
        return toHttpError(() => CybridClient.createInvoice(data));
    }

    static getInvoice(invoiceGuid: string): Promise<InvoiceBankModel> {
        return toHttpError(() => {
            requireGuid(invoiceGuid, "Invoice");
            return CybridClient.getInvoice(invoiceGuid);
        });
    }

    static listInvoices(customerGuid?: string, page?: number, perPage?: number): Promise<InvoiceListBankModel> {
        return toHttpError(() => CybridClient.listInvoices(customerGuid, page, perPage));
    }

    static cancelInvoice(invoiceGuid: string): Promise<InvoiceBankModel> {
        return toHttpError(() => {
            requireGuid(invoiceGuid, "Invoice");
            return CybridClient.cancelInvoice(invoiceGuid);
        });
    }

    // --- Payment Instructions ---

    static createPaymentInstruction(data: PostPaymentInstructionBankModel): Promise<PaymentInstructionBankModel> {
        return toHttpError(() => CybridClient.createPaymentInstruction(data));
    }

    static getPaymentInstruction(paymentInstructionGuid: string): Promise<PaymentInstructionBankModel> {
        return toHttpError(() => {
            requireGuid(paymentInstructionGuid, "Payment Instruction");
            return CybridClient.getPaymentInstruction(paymentInstructionGuid);
        });
    }

    static listPaymentInstructions(
        customerGuid?: string,
        invoiceGuid?: string,
        page?: number,
        perPage?: number,
    ): Promise<PaymentInstructionListBankModel> {
        return toHttpError(() => CybridClient.listPaymentInstructions(customerGuid, invoiceGuid, page, perPage));
    }

    // --- Plans ---

    static createPlan(data: PostPlanBankModel): Promise<PlanBankModel> {
        return toHttpError(() => CybridClient.createPlan(data));
    }

    static getPlan(planGuid: string): Promise<PlanBankModel> {
        return toHttpError(() => {
            requireGuid(planGuid, "Plan");
            return CybridClient.getPlan(planGuid);
        });
    }

    static listPlans(customerGuid?: string, page?: number, perPage?: number): Promise<PlanListBankModel> {
        return toHttpError(() => CybridClient.listPlans(customerGuid, page, perPage));
    }
}
