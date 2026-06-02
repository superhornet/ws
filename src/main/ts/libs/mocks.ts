import { router as AuditRouter } from '../../../main/ts/controllers/AuditController.ts'
import { router as SessionRouter } from '../../../main/ts/controllers/SessionController.ts'
import type { NotificationAPIType } from '../types/NotificationAPITypes.ts';
import type { StackAPIType } from '../types/StackAPITypes.ts';
import { type SubStackAPIType } from '../types/SubStackAPITypes.ts';
import { SubscriptionType } from '../types/SubscriptionTypes.ts';
import { TransactionItemType, TransactionProcessorType, type TransactionAPIType } from '../types/TransactionAPITypes.ts';
import type { UserAPIType } from '../types/UserAPITypes.ts';

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
    const req = { Request };
    const res = {
        statusCode: -1,
        body: {
            code: -1,
            data: null,
            message: ""
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: typeof this.body) {
            this.body = payload;
            return this;
        }
    };
    return { req, res };
}
export function mockSession() {
    const req = {};
    const res = {
        statusCode: -1,
        body: {
                code: -1,
                data: {
                    uuid: "",
                    expires: "",
                    otp: ""
                },
                message: ""
            },
        status(code: number)/*: Response */{
            this.statusCode = code;
            return this /*as Response*/;
        },
        json(payload: typeof this.body/*{
                code: number,
                data: {
                    uuid: string,
                    expires: string,
                    otp: string
                },
                message: string
            }*/)/*: Response */{
            this.body = payload;
            return this.body/* as Response*/;
        }
    } /*as unknown as Response*/;
    return { req, res };
}
export function mockAudit(data?: {body?: { session?: string, message?: string }}) {
    const req = data;
    const res = {
        statusCode: -1,
        body: {
            code: -1,
            data:{
            },
            message: ""
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: typeof this.body) {
            this.body = payload;
            return this;
        }
    };
    return { req, res };
}
export function mockUser(data?: { body?: { data?: UserAPIType; message: string|null; session: string; user_identifier?: string}}) {
    const req =  data ;
    const res = {
        statusCode: -1,
        body: {
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
                user_identifier: ""
            },
            message: "",
            session: "",

        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: typeof this.body) {
            this.body = payload;
            return this;
        }
    };
    return { req, res };
}
export function mockNotification( data?: {params?:{id: number}, body?: { data?: Array<NotificationAPIType>|NotificationAPIType; message?: string; session?: string}}) {
    const req = data;
    const res = {
        statusCode: -1,
        body: {
            code: -1,
            data: [{
                message: "", //Notification Text
                notification_for: "", //Notification Recipient
                note_identifier: ""
            }],
            message: "", //Creation message
            session: "",
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: typeof this.body) {
            this.body = payload;
            return this;
        }
    };
    return { req, res };
}
export function mockStack( data?: { body?: { data?: StackAPIType; message: string|null; session: string;}}) {
    const req = data ;
    const res = {
        statusCode: -1,
        body: {
            code: -1,
            data: {
                stack_name: "", //Stack Name
                stack_identifier: "", //Stack Ident
                owner_identifier: "", //Stack Owner
            },
            message: "", //Creation message
            session: ""
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: typeof this.body) {
            this.body = payload;
            return this;
        }
    };
    return { req, res };
}
export function mockSubStack( data?: { body?: { data?: SubStackAPIType; message?: string; session?: string;}}) {
    const req = data ;
    const res = {
        statusCode: -1,
        body: {
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
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: typeof this.body) {
            this.body = payload;
            return this;
        }
    };
    return { req, res };
}
export function mockSubStackList( data?: { body?: {type: string}|{ data?: Array<SubStackAPIType>; message?: string; session?: string;}}) {
    const req = data ;
    const res = {
        statusCode: -1,
        body: {
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
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: typeof this.body) {
            this.body = payload;
            return this;
        }
    };
    return { req, res };
}
export function mockTransaction(data?: {body?: {data?: TransactionAPIType, message?: string, session?: string}}) {
    const req = data ;
    const res = {
        statusCode: -1,
        body: {
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
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: typeof this.body) {
            this.body = payload;
            return this;
        }
    };
    return { req, res };
}
export function mockTransactionList( data?: { body?: {key: string, value: string, message?: string, session?: string;}|{ data?: TransactionAPIType; message?: string; session?: string;}}) {
    const req = data ;
    const res = {
        statusCode: -1,
        body: {
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
        },
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: typeof this.body) {
            this.body = payload;
            return this;
        }
    };
    return { req, res };
}
