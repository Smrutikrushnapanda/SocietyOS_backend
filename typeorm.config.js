require('dotenv').config();
const { DataSource } = require('typeorm');

function shouldSynchronize() {
  const nodeEnv = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  if (nodeEnv === 'production') {
    return false;
  }
  const syncRaw = process.env.DB_SYNCHRONIZE;
  if (!syncRaw) {
    return false;
  }
  const syncVal = syncRaw.trim().toLowerCase();
  return syncVal === 'true' || syncVal === '1';
}

function getDataSourceConfig() {
  const isProduction = (process.env.NODE_ENV || 'development').trim().toLowerCase() === 'production';
  const sync = shouldSynchronize();
  const baseConfig = {
    type: 'postgres',
    synchronize: sync,
    logging: isProduction ? ['error', 'warn'] : 'all',
    entities: ['dist/**/database/entities/**/*.entity.js'],
    ssl: {
      rejectUnauthorized: true,
    },
  };

  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      url: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('sslmode=disable')
        ? false
        : { rejectUnauthorized: true },
    };
  }

  if (process.env.DB_HOST && process.env.DB_USERNAME) {
    return {
      ...baseConfig,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'postgres',
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: true },
    };
  }

  return {
    ...baseConfig,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    username: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    ssl: false,
  };
}

module.exports = new DataSource(getDataSourceConfig());
module.exports.shouldSynchronize = shouldSynchronize;
module.exports.getDataSourceConfig = getDataSourceConfig;
