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
} from '@cybrid/cybrid-api-bank-typescript';

export interface CybridAPIType extends JSON {
    message: string;
    session: string;
    identifier: string;
    action: string;
}

export interface FiatTransferRequest {
    session: string;
    source_account_guid: string;
    destination_account_guid: string;
    amount: number;
    asset?: string;
}
