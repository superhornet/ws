import { router as AuditRouter } from '../../../main/ts/controllers/AuditController.ts'
import { router as SessionRouter } from '../../../main/ts/controllers/SessionController.ts'
import type { NotificationAPIType } from '../types/NotificationAPITypes.ts';
import { SubscriptionType } from '../types/SubscriptionTypes.ts';
import type { UserAPIType } from '../types/UserAPITypes.ts';
//import {type Request, type Response } from "express";
export function findRouteHandler(router: typeof AuditRouter| typeof SessionRouter, method: string, path: string) {
    const layer = router.stack.find(
        (layer) =>
            layer.route?.path === path &&
            // @ts-expect-error methods is an undocumented property
            layer.route.methods[method.toLowerCase()]
    );
    return layer?.route?.stack[0]?.handle;
}
export function mockSession(/*data?:
        {
            statusCode:number,
            body: {
                code: number,
                data: {
                    uuid: string,
                    expires: string,
                    otp: string
                },
                message: string
            }
            status: typeof Function,
            json: typeof Function
        }*/) {
    const req = {};//data as unknown as Request;
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
export function mockNotification( data?: {params?:{id: number}, body?: { data?: NotificationAPIType; message: string|null; session: string; note_identifier?: string}}) {
    const req = { data };
    const res = {
        statusCode: -1,
        body: {
            code: -1,
            data: {
                message: "", //Notification Text
                noification_for: "", //Notification Recipient
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
