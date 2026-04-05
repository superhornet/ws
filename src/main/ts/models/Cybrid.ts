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
    IdentityVerificationWithDetailsBankModel,
    PostIdentityVerificationBankModel,
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

    static async getCustomer(customerGuid: string): Promise<CustomerBankModel> {
        try {
            if (!customerGuid) {
                throw new HTMLStatusError("Customer GUID is required", 400);
            }
            return await CybridClient.getCustomer(customerGuid);
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
}
