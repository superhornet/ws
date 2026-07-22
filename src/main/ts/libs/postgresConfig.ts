import type { ClientConfig } from "pg";

type RequiredDiscreteEnvKey =
    | "POSTGRES_HOST"
    | "POSTGRES_USER"
    | "POSTGRES_PASSWORD"
    | "POSTGRES_DATABASE"
    | "POSTGRES_PORT";

type PostgresEnv = NodeJS.ProcessEnv;

const getRequiredEnv = (env: PostgresEnv, key: RequiredDiscreteEnvKey): string => {
    const value = env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key} (or set DATABASE_URL)`);
    }

    return value;
};

const getPort = (env: PostgresEnv): number => {
    const rawPort = getRequiredEnv(env, "POSTGRES_PORT");
    const port = Number(rawPort);

    if (!Number.isInteger(port) || port <= 0) {
        throw new Error(`Invalid POSTGRES_PORT: ${rawPort}`);
    }

    return port;
};

export const getPostgresConnectionConfig = (env: PostgresEnv = process.env): ClientConfig => {
    const sslEnabled = env.POSTGRES_SSL === "true";
    const ssl = sslEnabled
        ? { rejectUnauthorized: env.POSTGRES_SSL_REJECT_UNAUTHORIZED === "true" }
        : undefined;
    const sslConfig = ssl ? { ssl } : {};

    if (env.DATABASE_URL) {
        return {
            connectionString: env.DATABASE_URL,
            ...sslConfig,
        };
    }

    return {
        host: getRequiredEnv(env, "POSTGRES_HOST"),
        user: getRequiredEnv(env, "POSTGRES_USER"),
        password: getRequiredEnv(env, "POSTGRES_PASSWORD"),
        database: getRequiredEnv(env, "POSTGRES_DATABASE"),
        port: getPort(env),
        ...sslConfig,
    };
};
