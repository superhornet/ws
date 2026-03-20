import dotenv from "dotenv";
import { DatabaseSync } from "node:sqlite";
import { generateUUID } from "../libs/UUID.js";
import { SubscriptionType } from "../types/SubscriptionTypes.js";
import { HTMLStatusError } from "../libs/HTMLStatusError.js";
export class User {
    get User() {
        return this.userObj;
    }
    set User(value) {
        this.userObj = value;
    }
    _User;
    _UserConfig;
    userObj;
    environment;
    id;
    database;
    constructor(firstname, lastname, email, city, state, subscriptionlevel) {
        const [userid, hostname] = email.split("@");
        const user = {
            nameF: firstname,
            nameL: lastname,
            email,
            emailID: userid || "",
            emailHost: hostname || "",
            city,
            state,
            subscriptionLevel: subscriptionlevel || SubscriptionType.FREE,
            identifier: generateUUID()
        };
        this.User = {
            _User: user,
            _UserConfig: {
                forUser: user.identifier
            }
        };
        this.storeUser();
    }
    toJSON() {
        const data = this.User?._User;
        return {
            city: data.city,
            email: data.email,
            emailHost: data.emailHost,
            emailID: data.emailID,
            firstname: data.nameF,
            id: this.id,
            identifier: data.identifier,
            lastname: data.nameL,
            state: data.state,
            subscriptionLevel: data.subscriptionLevel,
        };
    }
    storeUser() {
        const data = this.User?._User;
        this.openDatabase();
        const sql = this.database.createTagStore();
        const runData = sql.run `INSERT INTO users (email,emailHost,emailID,firstname,lastname,identifier,city,state,level) VALUES
        (${data.email}, ${data.emailHost}, ${data.emailID}, ${data.nameF}, ${data.nameL}, ${data.identifier}, ${data.city}, ${data.state}, ${data.subscriptionLevel})`;
        this.id = Number.parseInt(runData.lastInsertRowid.valueOf().toString());
        this.closeDatabase();
    }
    openDatabase() {
        dotenv.config({ quiet: true });
        this.environment = process.env.NODE_ENV || "production";
        switch (this.environment) {
            case "development":
                this.database = this.openDevDatabase();
                break;
            case "production":
                this.openProdDatabase();
                break;
            default:
                break;
        }
    }
    closeDatabase() {
        dotenv.config({ quiet: true });
        this.environment = process.env.NODE_ENV || "production";
        switch (this.environment) {
            case "development":
                this.closeDevDatabase();
                break;
            case "production":
                this.openProdDatabase();
                break;
            default:
                break;
        }
    }
    openDevDatabase() {
        let database;
        try {
            database = new DatabaseSync("westack.db");
        }
        catch (error) {
            throw new Error(error.message);
        }
        return database;
    }
    openProdDatabase() {
        throw new Error("Production Dababase is Pending");
    }
    closeDevDatabase() {
        try {
            this.database.close();
        }
        catch (error) {
            throw new Error(error.message);
        }
    }
    static fetchById(userid) {
        let user;
        try {
            const database = new DatabaseSync('westack.db');
            const fetchedUser = database.prepare(`SELECT id, email, firstname, lastname, identifier, city, state, level FROM users WHERE identifier = ? AND deleted = 0;`).get(userid);
            database.close();
            if (fetchedUser) {
                user = {
                    id: fetchedUser.id,
                    email: fetchedUser.email,
                    firstname: fetchedUser.firstname,
                    lastname: fetchedUser.lastname,
                    identifier: fetchedUser.identifier,
                    city: fetchedUser.city,
                    state: fetchedUser.state,
                    level: fetchedUser.level
                };
            }
            else {
                throw new HTMLStatusError("User was not found", 404);
            }
            return user;
        }
        catch (error) {
            if (error instanceof HTMLStatusError) {
                throw error;
            }
            else {
                throw new HTMLStatusError(error.message, 500);
            }
        }
    }
    static updateUser(data) {
        try {
            if (data.identifier === undefined ||
                data.firstname === undefined ||
                data.lastname === undefined) {
                throw new HTMLStatusError("Missing JSON Data", 400);
            }
            const database = new DatabaseSync('westack.db');
            const [userid, hostname] = data.email.split('@');
            database.exec(`UPDATE users SET email='${data.email}', emailID='${userid}', emailhost='${hostname}', firstname='${data.firstname}', lastname='${data.lastname}', city='${data.city}', state='${data.state}', level='${data.level}' where identifier = '${data.identifier}'`);
            database.close();
        }
        catch (error) {
            throw new HTMLStatusError(error.message, 500);
        }
    }
    static deleteUser(data) {
        //console.log(`Data: ${(data.identifier)}`);
        try {
            if (data.identifier === undefined) {
                throw new HTMLStatusError("Missing JSON Data", 400);
            }
            const database = new DatabaseSync('westack.db');
            const result = database.prepare(`UPDATE users SET deleted=1 WHERE identifier = ?;`).run(data.identifier);
            if (result.changes === 0) {
                throw new HTMLStatusError("No user match to delete", 404);
            }
            database.close();
        }
        catch (error) {
            throw new HTMLStatusError(error.message, 500);
        }
    }
}
//# sourceMappingURL=User.js.map