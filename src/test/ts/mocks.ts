import { router as AuditRouter } from '../../main/ts/controllers/AuditController.ts'
import { router as SessionRouter } from '../../main/ts/controllers/SessionController.ts'
import type { NotificationAPIType } from '../../main/ts/types/NotificationAPITypes.ts';
import type { StackAPIType } from '../../main/ts/types/StackAPITypes.ts';
import { type SubStackAPIType } from '../../main/ts/types/SubStackAPITypes.ts';
import { SubscriptionType } from '../../main/ts/types/SubscriptionTypes.ts';
import { TransactionItemType, TransactionProcessorType, type TransactionAPIType } from '../../main/ts/types/TransactionAPITypes.ts';
import type { UserAPIType } from '../../main/ts/types/UserAPITypes.ts';
import { AffiliationType, type AffiliateAPIType } from '../../main/ts/types/AffiliateAPITypes.ts';

function createMockResponse<TBody>(initialBody: TBody) {
    // statusCode/code start at -1 as a "no response sent yet" sentinel so a
    // handler that never responds is visibly distinguishable in tests.
    return {
        statusCode: -1,
        body: initialBody,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: TBody) {
            this.body = payload;
            return this;
        },
    };
}

/**
 * Builds a mock Express request for GET read endpoints that accept query params
 * and an `X-Session` header instead of a JSON body.
 */
export function mockGetRequest(data?: {
    headers?: Record<string, string>;
    query?: Record<string, string>;
    params?: Record<string, string>;
    body?: Record<string, unknown>;
}) {
    const req = {
        headers: data?.headers ?? {},
        query: data?.query ?? {},
        params: data?.params ?? {},
        body: data?.body,
    };
    return {
        req,
        res: createMockResponse<Record<string, unknown>>({ code: -1, data: null, message: "" }),
    };
}

export function findRouteHandler(router: typeof AuditRouter| typeof SessionRouter, method: string, path: string) {
    const layer = router.stack.find(
        (layer) =>
            layer.route?.path === path &&
            // @ts-expect-error methods is an undocumented property
            layer.route.methods[method.toLowerCase()]
    );
    return layer?.route?.stack[0]?.handle;
}
export function mockHealth() {
    return {
        req: {},
        res: createMockResponse({
            code: -1,
            data: null,
            message: ""
        }),
    };
}
export function mockSession() {
    return {
        req: {},
        res: createMockResponse({
            code: -1,
            data: {
                uuid: "",
                expires: ""
            },
            message: ""
        }),
    };
}
export function mockAudit(data?: {body?: { session?: string, message?: string, action?: string, entity?: string, entity_identifier?: string }}) {
    return {
        req: data,
        res: createMockResponse({
            code: -1,
            data: {},
            message: ""
        }),
    };
}
export function mockUser(data?: { body?: { data?: UserAPIType; message: string|null; session: string; user_identifier?: string}}) {
    return {
        req: data,
        res: createMockResponse({
            code: -1,
            data: {
                firstname: "",
                lastname: "",
                email: "",
                address1: "",
                address2: "",
                city: "",
                state: "",
                zipcode: "",
                subscription_level: SubscriptionType,
                user_identifier: "",
                affiliate: ""
            },
            message: "",
            session: "",
        }),
    };
}
export function mockNotification( data?: {params?:{id: number}, body?: { data?: Array<NotificationAPIType>|NotificationAPIType; message?: string; session?: string}}) {
    return {
        req: data,
        res: createMockResponse({
            code: -1,
            data: [{
                message: "", //Notification Text
                notification_for: "", //Notification Recipient
                note_identifier: ""
            }],
            message: "", //Creation message
            session: "",
        }),
    };
}
export function mockStack( data?: { body?: { data?: StackAPIType; message: string|null; session: string;}}) {
    return {
        req: data,
        res: createMockResponse({
            code: -1,
            data: {
                stack_name: "", //Stack Name
                stack_identifier: "", //Stack Ident
                owner_identifier: "", //Stack Owner
            },
            message: "", //Creation message
            session: ""
        }),
    };
}
export function mockSubStack( data?: { body?: { data?: SubStackAPIType; message?: string; session?: string;}}) {
    return {
        req: data,
        res: createMockResponse({
            code: -1,
            data: {
                substack_name: "", //SubStack Name
                substack_identifier: "", //SubStack Ident
                stack_identifier: "", //Parent Stack
                users_list: [],
                balance: 0
            },
            message: "", //Creation message
            session: ""
        }),
    };
}
export function mockSubStackList( data?: { body?: {type: string}|{ data?: Array<SubStackAPIType>; message?: string; session?: string;}}) {
    return {
        req: data,
        res: createMockResponse({
            code: -1,
            data: [{
                substack_name: "", //SubStack Name
                substack_identifier: "", //SubStack Ident
                stack_identifier: "", //Parent Stack
                users_list: [],
                balance: 0
            }],
            message: "", //Creation message
            session: ""
        }),
    };
}
export function mockTransaction(data?: {body?: {data?: TransactionAPIType, message?: string, session?: string}}) {
    return {
        req: data,
        res: createMockResponse({
            data: {
                processor: TransactionProcessorType,
                transactionType: TransactionItemType,
                amount: 0,
                to_identifier: "",
                from_identifier: "",
                notation: "",
                initiated_by: ""
            },
            message: "",
            session: ""
        }),
    };
}
export function mockTransactionList( data?: { body?: {key: string, value: string, message?: string, session?: string;}|{ data?: TransactionAPIType; message?: string; session?: string;}}) {
    return {
        req: data,
        res: createMockResponse({
            code: -1,
            data: [{
                processor: TransactionProcessorType,
                transactionType: TransactionItemType,
                amount: 0,
                to_identifier: "",
                from_identifier: "",
                notation: "",
                initiated_by: ""
            }],
            message: "", //Creation message
            session: ""
        }),
    };
}
export function mockAffiliate( data?: {body?: {data?: AffiliateAPIType, message?: string, session?: string}}){
    return {
        req: data,
        res: createMockResponse({
            code: -1,
            data: [{
                affiliation_code: "",
                affiliation_type: AffiliationType,
                referrer: ""
            }],
            message: "", //Creation message
            session: ""
        }),
    };
}
