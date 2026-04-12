import { HTMLStatusError } from "../libs/HTMLStatusError.ts";
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

    static async createCustomer(data: PostCustomerBankModel): Promise<CustomerBankModel> {
        try {
            return await CybridClient.createCustomer(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getCustomer(customerGuid: string, includePii = false): Promise<CustomerBankModel> {
        try {
            if (!customerGuid) {
                throw new HTMLStatusError("Customer GUID is required", 400);
            }
            return await CybridClient.getCustomer(customerGuid, includePii);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listCustomers(page?: number, perPage?: number): Promise<CustomerListBankModel> {
        try {
            return await CybridClient.listCustomers(page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async updateCustomer(customerGuid: string, data: PatchCustomerBankModel): Promise<CustomerBankModel> {
        try {
            if (!customerGuid) {
                throw new HTMLStatusError("Customer GUID is required", 400);
            }
            return await CybridClient.updateCustomer(customerGuid, data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Accounts ---

    static async createAccount(data: PostAccountBankModel): Promise<AccountBankModel> {
        try {
            return await CybridClient.createAccount(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getAccount(accountGuid: string): Promise<AccountBankModel> {
        try {
            if (!accountGuid) {
                throw new HTMLStatusError("Account GUID is required", 400);
            }
            return await CybridClient.getAccount(accountGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listAccounts(customerGuid?: string, page?: number, perPage?: number): Promise<AccountListBankModel> {
        try {
            return await CybridClient.listAccounts(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Quotes ---

    static async createQuote(data: PostQuoteBankModel): Promise<QuoteBankModel> {
        try {
            return await CybridClient.createQuote(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getQuote(quoteGuid: string): Promise<QuoteBankModel> {
        try {
            if (!quoteGuid) {
                throw new HTMLStatusError("Quote GUID is required", 400);
            }
            return await CybridClient.getQuote(quoteGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listQuotes(customerGuid?: string, page?: number, perPage?: number): Promise<QuoteListBankModel> {
        try {
            return await CybridClient.listQuotes(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Trades ---

    static async createTrade(data: PostTradeBankModel): Promise<TradeBankModel> {
        try {
            return await CybridClient.createTrade(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getTrade(tradeGuid: string): Promise<TradeBankModel> {
        try {
            if (!tradeGuid) {
                throw new HTMLStatusError("Trade GUID is required", 400);
            }
            return await CybridClient.getTrade(tradeGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listTrades(customerGuid?: string, page?: number, perPage?: number): Promise<TradeListBankModel> {
        try {
            return await CybridClient.listTrades(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Transfers ---

    static async createTransfer(data: PostTransferBankModel): Promise<TransferBankModel> {
        try {
            return await CybridClient.createTransfer(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getTransfer(transferGuid: string): Promise<TransferBankModel> {
        try {
            if (!transferGuid) {
                throw new HTMLStatusError("Transfer GUID is required", 400);
            }
            return await CybridClient.getTransfer(transferGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listTransfers(customerGuid?: string, page?: number, perPage?: number): Promise<TransferListBankModel> {
        try {
            return await CybridClient.listTransfers(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async updateTransfer(transferGuid: string, data: PatchTransferBankModel): Promise<TransferBankModel> {
        try {
            if (!transferGuid) {
                throw new HTMLStatusError("Transfer GUID is required", 400);
            }
            return await CybridClient.updateTransfer(transferGuid, data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Book Transfers (fiat customer-to-customer) ---

    static async transferFiat(
        sourceAccountGuid: string,
        destinationAccountGuid: string,
        amount: number,
        asset?: string,
    ): Promise<TransferBankModel> {
        try {
            if (!sourceAccountGuid) {
                throw new HTMLStatusError("Source account GUID is required", 400);
            }
            if (!destinationAccountGuid) {
                throw new HTMLStatusError("Destination account GUID is required", 400);
            }
            if (!amount || amount <= 0) {
                throw new HTMLStatusError("Amount must be a positive number", 400);
            }
            if (!Number.isInteger(amount) || !Number.isSafeInteger(amount)) {
                throw new HTMLStatusError("Amount must be a safe integer (in cents)", 400);
            }
            if (amount > 1_000_000_00) {
                throw new HTMLStatusError("Amount exceeds maximum transfer limit of $1,000,000", 400);
            }
            return await CybridClient.createBookTransfer(sourceAccountGuid, destinationAccountGuid, amount, asset);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Identity Verification ---

    static async createIdentityVerification(data: PostIdentityVerificationBankModel): Promise<IdentityVerificationBankModel> {
        try {
            return await CybridClient.createIdentityVerification(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getIdentityVerification(verificationGuid: string): Promise<IdentityVerificationWithDetailsBankModel> {
        try {
            if (!verificationGuid) {
                throw new HTMLStatusError("Verification GUID is required", 400);
            }
            return await CybridClient.getIdentityVerification(verificationGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listIdentityVerifications(customerGuid?: string, page?: number, perPage?: number): Promise<IdentityVerificationListBankModel> {
        try {
            return await CybridClient.listIdentityVerifications(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Symbols ---

    static async listSymbols(): Promise<Array<string>> {
        try {
            return await CybridClient.listSymbols();
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Assets ---

    static async listAssets(page?: number, perPage?: number, code?: string): Promise<AssetListBankModel> {
        try {
            return await CybridClient.listAssets(page, perPage, code);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Prices ---

    static async listPrices(symbol?: string): Promise<Array<SymbolPriceBankModel>> {
        try {
            return await CybridClient.listPrices(symbol);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Deposit Addresses ---

    static async createDepositAddress(data: PostDepositAddressBankModel): Promise<DepositAddressBankModel> {
        try {
            return await CybridClient.createDepositAddress(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getDepositAddress(depositAddressGuid: string): Promise<DepositAddressBankModel> {
        try {
            if (!depositAddressGuid) {
                throw new HTMLStatusError("Deposit Address GUID is required", 400);
            }
            return await CybridClient.getDepositAddress(depositAddressGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listDepositAddresses(customerGuid?: string, page?: number, perPage?: number): Promise<DepositAddressListBankModel> {
        try {
            return await CybridClient.listDepositAddresses(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Deposit Bank Accounts ---

    static async createDepositBankAccount(data: PostDepositBankAccountBankModel): Promise<DepositBankAccountBankModel> {
        try {
            return await CybridClient.createDepositBankAccount(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getDepositBankAccount(depositBankAccountGuid: string): Promise<DepositBankAccountBankModel> {
        try {
            if (!depositBankAccountGuid) {
                throw new HTMLStatusError("Deposit Bank Account GUID is required", 400);
            }
            return await CybridClient.getDepositBankAccount(depositBankAccountGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listDepositBankAccounts(customerGuid?: string, page?: number, perPage?: number): Promise<DepositBankAccountListBankModel> {
        try {
            return await CybridClient.listDepositBankAccounts(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- External Bank Accounts ---

    static async createExternalBankAccount(data: PostExternalBankAccountBankModel): Promise<ExternalBankAccountBankModel> {
        try {
            return await CybridClient.createExternalBankAccount(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getExternalBankAccount(
        externalBankAccountGuid: string,
        includeBalances = false,
        forceBalanceRefresh = false,
        includePii = false,
    ): Promise<ExternalBankAccountBankModel> {
        try {
            if (!externalBankAccountGuid) {
                throw new HTMLStatusError("External Bank Account GUID is required", 400);
            }
            return await CybridClient.getExternalBankAccount(externalBankAccountGuid, includeBalances, forceBalanceRefresh, includePii);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listExternalBankAccounts(customerGuid?: string, page?: number, perPage?: number): Promise<ExternalBankAccountListBankModel> {
        try {
            return await CybridClient.listExternalBankAccounts(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async patchExternalBankAccount(
        externalBankAccountGuid: string,
        data: PatchExternalBankAccountBankModel,
    ): Promise<ExternalBankAccountBankModel> {
        try {
            if (!externalBankAccountGuid) {
                throw new HTMLStatusError("External Bank Account GUID is required", 400);
            }
            return await CybridClient.patchExternalBankAccount(externalBankAccountGuid, data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async deleteExternalBankAccount(externalBankAccountGuid: string): Promise<ExternalBankAccountBankModel> {
        try {
            if (!externalBankAccountGuid) {
                throw new HTMLStatusError("External Bank Account GUID is required", 400);
            }
            return await CybridClient.deleteExternalBankAccount(externalBankAccountGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- External Wallets ---

    static async createExternalWallet(data: PostExternalWalletBankModel): Promise<ExternalWalletBankModel> {
        try {
            return await CybridClient.createExternalWallet(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getExternalWallet(externalWalletGuid: string): Promise<ExternalWalletBankModel> {
        try {
            if (!externalWalletGuid) {
                throw new HTMLStatusError("External Wallet GUID is required", 400);
            }
            return await CybridClient.getExternalWallet(externalWalletGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listExternalWallets(customerGuid?: string, page?: number, perPage?: number): Promise<ExternalWalletListBankModel> {
        try {
            return await CybridClient.listExternalWallets(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async deleteExternalWallet(externalWalletGuid: string): Promise<ExternalWalletBankModel> {
        try {
            if (!externalWalletGuid) {
                throw new HTMLStatusError("External Wallet GUID is required", 400);
            }
            return await CybridClient.deleteExternalWallet(externalWalletGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Workflows ---

    static async createWorkflow(data: PostWorkflowBankModel): Promise<WorkflowBankModel> {
        try {
            return await CybridClient.createWorkflow(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getWorkflow(workflowGuid: string): Promise<WorkflowWithDetailsBankModel> {
        try {
            if (!workflowGuid) {
                throw new HTMLStatusError("Workflow GUID is required", 400);
            }
            return await CybridClient.getWorkflow(workflowGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listWorkflows(customerGuid?: string, page?: number, perPage?: number): Promise<WorkflowsListBankModel> {
        try {
            return await CybridClient.listWorkflows(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Banks ---

    static async createBank(data: PostBankBankModel): Promise<BankBankModel> {
        try {
            return await CybridClient.createBank(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getBank(bankGuid: string): Promise<BankBankModel> {
        try {
            if (!bankGuid) {
                throw new HTMLStatusError("Bank GUID is required", 400);
            }
            return await CybridClient.getBank(bankGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listBanks(page?: number, perPage?: number, type?: string): Promise<BankListBankModel> {
        try {
            return await CybridClient.listBanks(page, perPage, type);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async updateBank(bankGuid: string, data: PatchBankBankModel): Promise<BankBankModel> {
        try {
            if (!bankGuid) {
                throw new HTMLStatusError("Bank GUID is required", 400);
            }
            return await CybridClient.updateBank(bankGuid, data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Counterparties ---

    static async createCounterparty(data: PostCounterpartyBankModel): Promise<CounterpartyBankModel> {
        try {
            return await CybridClient.createCounterparty(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getCounterparty(counterpartyGuid: string, includePii = false): Promise<CounterpartyBankModel> {
        try {
            if (!counterpartyGuid) {
                throw new HTMLStatusError("Counterparty GUID is required", 400);
            }
            return await CybridClient.getCounterparty(counterpartyGuid, includePii);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listCounterparties(customerGuid?: string, page?: number, perPage?: number): Promise<CounterpartyListBankModel> {
        try {
            return await CybridClient.listCounterparties(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Persona Sessions ---

    static async createPersonaSession(data: PostPersonaSessionBankModel): Promise<PersonaSessionBankModel> {
        try {
            return await CybridClient.createPersonaSession(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Files ---

    static async createFile(data: PostFileBankModel): Promise<PlatformFileBankModel> {
        try {
            return await CybridClient.createFile(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getFile(fileGuid: string, includeDownloadUrl?: string): Promise<PlatformFileBankModel> {
        try {
            if (!fileGuid) {
                throw new HTMLStatusError("File GUID is required", 400);
            }
            return await CybridClient.getFile(fileGuid, includeDownloadUrl);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listFiles(customerGuid?: string, page?: number, perPage?: number): Promise<PlatformFileListBankModel> {
        try {
            return await CybridClient.listFiles(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Executions ---

    static async createExecution(data: PostExecutionBankModel): Promise<ExecutionBankModel> {
        try {
            return await CybridClient.createExecution(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getExecution(executionGuid: string): Promise<ExecutionBankModel> {
        try {
            if (!executionGuid) {
                throw new HTMLStatusError("Execution GUID is required", 400);
            }
            return await CybridClient.getExecution(executionGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listExecutions(customerGuid?: string, page?: number, perPage?: number): Promise<ExecutionListBankModel> {
        try {
            return await CybridClient.listExecutions(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Invoices ---

    static async createInvoice(data: PostInvoiceBankModel): Promise<InvoiceBankModel> {
        try {
            return await CybridClient.createInvoice(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getInvoice(invoiceGuid: string): Promise<InvoiceBankModel> {
        try {
            if (!invoiceGuid) {
                throw new HTMLStatusError("Invoice GUID is required", 400);
            }
            return await CybridClient.getInvoice(invoiceGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listInvoices(customerGuid?: string, page?: number, perPage?: number): Promise<InvoiceListBankModel> {
        try {
            return await CybridClient.listInvoices(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async cancelInvoice(invoiceGuid: string): Promise<InvoiceBankModel> {
        try {
            if (!invoiceGuid) {
                throw new HTMLStatusError("Invoice GUID is required", 400);
            }
            return await CybridClient.cancelInvoice(invoiceGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Payment Instructions ---

    static async createPaymentInstruction(data: PostPaymentInstructionBankModel): Promise<PaymentInstructionBankModel> {
        try {
            return await CybridClient.createPaymentInstruction(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getPaymentInstruction(paymentInstructionGuid: string): Promise<PaymentInstructionBankModel> {
        try {
            if (!paymentInstructionGuid) {
                throw new HTMLStatusError("Payment Instruction GUID is required", 400);
            }
            return await CybridClient.getPaymentInstruction(paymentInstructionGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listPaymentInstructions(
        customerGuid?: string,
        invoiceGuid?: string,
        page?: number,
        perPage?: number,
    ): Promise<PaymentInstructionListBankModel> {
        try {
            return await CybridClient.listPaymentInstructions(customerGuid, invoiceGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    // --- Plans ---

    static async createPlan(data: PostPlanBankModel): Promise<PlanBankModel> {
        try {
            return await CybridClient.createPlan(data);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async getPlan(planGuid: string): Promise<PlanBankModel> {
        try {
            if (!planGuid) {
                throw new HTMLStatusError("Plan GUID is required", 400);
            }
            return await CybridClient.getPlan(planGuid);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }

    static async listPlans(customerGuid?: string, page?: number, perPage?: number): Promise<PlanListBankModel> {
        try {
            return await CybridClient.listPlans(customerGuid, page, perPage);
        } catch (error) {
            if (error instanceof HTMLStatusError) throw error;
            throw new HTMLStatusError((error as Error).message, 500);
        }
    }
}
