export const envVariables = {
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

export type EnvVariables = typeof envVariables;

// Production-grade environment validation
export const validate = (customEnv?: Record<string, string | undefined>): void => {
  const env = customEnv || process.env;
  const errors: string[] = [];
  const nodeEnv = (env.NODE_ENV || 'development').trim().toLowerCase();
  const isProduction = nodeEnv === 'production';

  // 1. Mandatory core variables
  if (!env.NODE_ENV) {
    errors.push('Missing required environment variable: NODE_ENV');
  }

  // 2. Database validation
  const hasDbUrl = Boolean(env.DATABASE_URL && env.DATABASE_URL.trim().length > 0);
  const hasDbHost = Boolean(env.DB_HOST && env.DB_HOST.trim().length > 0);
  if (!hasDbUrl && !hasDbHost) {
    errors.push('Missing database configuration: either DATABASE_URL or DB_HOST must be provided.');
  }

  // 3. Reject insecure TypeORM synchronize in production
  if (isProduction) {
    const syncVal = (env.DB_SYNCHRONIZE || '').trim().toLowerCase();
    if (syncVal === 'true' || syncVal === '1') {
      errors.push('Insecure configuration: DB_SYNCHRONIZE cannot be true in production.');
    }
  }

  // 4. JWT secrets validation
  const accessSecret = env.JWT_ACCESS_TOKEN_SECRET?.trim();
  const refreshSecret = env.JWT_REFRESH_TOKEN_SECRET?.trim();

  if (!accessSecret) {
    errors.push('Missing required environment variable: JWT_ACCESS_TOKEN_SECRET');
  } else if (isProduction && accessSecret.length < 32) {
    errors.push('Insecure JWT_ACCESS_TOKEN_SECRET: must be at least 32 characters in production.');
  }

  if (!refreshSecret) {
    errors.push('Missing required environment variable: JWT_REFRESH_TOKEN_SECRET');
  } else if (isProduction && refreshSecret.length < 32) {
    errors.push('Insecure JWT_REFRESH_TOKEN_SECRET: must be at least 32 characters in production.');
  }

  if (isProduction && accessSecret && refreshSecret && accessSecret === refreshSecret) {
    errors.push('Insecure configuration: JWT_ACCESS_TOKEN_SECRET and JWT_REFRESH_TOKEN_SECRET must not be identical.');
  }

  // 5. Redis configuration in production
  if (isProduction && !env.REDIS_URL) {
    errors.push('Missing required environment variable in production: REDIS_URL');
  }

  if (isProduction && !env.WAHA_WEBHOOK_SECRET?.trim()) {
    errors.push('Missing required environment variable in production: WAHA_WEBHOOK_SECRET');
  }

  if (errors.length > 0) {
    const sanitizedReport = errors.map((e) => `[CONFIG ERROR] ${e}`).join('\n');
    if (customEnv) {
      throw new Error(sanitizedReport);
    }
    console.error(sanitizedReport);
    process.exit(1);
  }
};
