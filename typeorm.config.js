const { DataSource } = require('typeorm');

module.exports = new DataSource({
  type: 'postgres',
  host: 'ep-fancy-dawn-b3cnlcc1-pooler.c-4.ap-southeast-1.aws.neon.tech',
  port: 5432,
  username: 'neondb_owner',
  password: 'npg_EjPNQowvl60h',
  database: 'neondb',
  synchronize: true,
  logging: 'all',
  entities: ['dist/database/entities/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  ssl: {
    rejectUnauthorized: false,
  },
});
