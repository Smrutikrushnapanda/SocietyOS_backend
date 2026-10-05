"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = exports.envVariables = void 0;
exports.envVariables = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    JWT_ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_TOKEN_SECRET,
    JWT_ACCESS_TOKEN_EXPIRES_IN: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
    JWT_REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_TOKEN_SECRET,
    JWT_REFRESH_TOKEN_EXPIRES_IN: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    SWAGGER_TITLE: process.env.SWAGGER_TITLE,
    SWAGGER_DESCRIPTION: process.env.SWAGGER_DESCRIPTION,
    SWAGGER_VERSION: process.env.SWAGGER_VERSION,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
};
const validate = () => {
    const errors = [];
    const required = [
        'NODE_ENV',
        'DATABASE_URL',
        'REDIS_URL',
        'JWT_ACCESS_TOKEN_SECRET',
        'JWT_REFRESH_TOKEN_SECRET',
    ];
    for (const key of required) {
        if (!process.env[key]) {
            errors.push(`Missing required environment variable: ${key}`);
        }
    }
    if (errors.length > 0) {
        console.error('Configuration validation errors:', errors);
        process.exit(1);
    }
};
exports.validate = validate;
//# sourceMappingURL=config.validation.js.map