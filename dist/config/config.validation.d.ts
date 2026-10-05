export declare const envVariables: {
    NODE_ENV: string | undefined;
    PORT: string | undefined;
    DATABASE_URL: string | undefined;
    REDIS_URL: string | undefined;
    JWT_ACCESS_TOKEN_SECRET: string | undefined;
    JWT_ACCESS_TOKEN_EXPIRES_IN: string | undefined;
    JWT_REFRESH_TOKEN_SECRET: string | undefined;
    JWT_REFRESH_TOKEN_EXPIRES_IN: string | undefined;
    SWAGGER_TITLE: string | undefined;
    SWAGGER_DESCRIPTION: string | undefined;
    SWAGGER_VERSION: string | undefined;
    CORS_ORIGIN: string | undefined;
};
export type EnvVariables = typeof envVariables;
export declare const validate: () => void;
