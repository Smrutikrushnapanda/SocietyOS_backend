import { DataSource, DataSourceOptions } from 'typeorm';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { PushTokenSafeLogger } from './push-token-safe-logger';
import { User } from '../database/entities/user.entity';
import { Role } from '../database/entities/role.entity';
import { Permission } from '../database/entities/permission.entity';
import { RolePermission } from '../database/entities/role-permission.entity';
import { UserRole } from '../database/entities/user-role.entity';
import { Organization } from '../database/entities/organization.entity';
import { Building } from '../database/entities/building.entity';
import { Floor } from '../database/entities/floor.entity';
import { Flat } from '../database/entities/flat.entity';
import { Resident } from '../database/entities/resident.entity';
import { Visitor } from '../database/entities/visitor.entity';
import { VisitorVisit } from '../database/entities/visitor-visit.entity';
import { VisitorApproval } from '../database/entities/visitor-approval.entity';
import { VisitorPass } from '../database/entities/visitor-pass.entity';
import { MaintenanceConfiguration } from '../database/entities/maintenance-configuration.entity';
import { MaintenanceDue } from '../database/entities/maintenance-due.entity';
import { Payment } from '../database/entities/payment.entity';
import { Complaint } from '../database/entities/complaint.entity';
import { ComplaintStatusHistory } from '../database/entities/complaint-status-history.entity';
import { Notice } from '../database/entities/notice.entity';
import { Poll } from '../database/entities/poll.entity';
import { PollOption } from '../database/entities/poll-option.entity';
import { PollVote } from '../database/entities/poll-vote.entity';
import { Notification } from '../database/entities/notification.entity';
import { PushToken } from '../database/entities/push-token.entity';
import { FileMetadata } from '../database/entities/file-metadata.entity';
import { DocumentFolder } from '../database/entities/document-folder.entity';
import { AuditLog } from '../audit/audit.entity';
import { Vehicle } from '../database/entities/vehicle.entity';
import { ParkingSlot } from '../database/entities/parking-slot.entity';
import { ComplaintPriorityConfig } from '../database/entities/complaint-priority-config.entity';
import { Vendor } from '../database/entities/vendor.entity';
import { AmcContract } from '../database/entities/amc-contract.entity';
import { Amenity } from '../database/entities/amenity.entity';
import { AmenityBooking } from '../database/entities/amenity-booking.entity';
import { StaffMember } from '../database/entities/staff-member.entity';
import { GuardShift } from '../database/entities/guard-shift.entity';
import { DutyRota } from '../database/entities/duty-rota.entity';
import { AdminUser } from '../database/entities/admin-user.entity';
import { MenuMaster } from '../database/entities/menu-master.entity';
import { RoleMenu } from '../database/entities/role-menu.entity';
import { ResidentNotificationPreference } from './entities/resident-notification-preference.entity';

/**
 * Canonical list of all registered TypeORM entities.
 */
export const ENTITY_LIST = [
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Organization,
  Building,
  Floor,
  Flat,
  Resident,
  Visitor,
  VisitorVisit,
  VisitorApproval,
  VisitorPass,
  MaintenanceConfiguration,
  MaintenanceDue,
  Payment,
  Complaint,
  ComplaintStatusHistory,
  Notice,
  Poll,
  PollOption,
  PollVote,
  Notification,
  PushToken,
  FileMetadata,
  DocumentFolder,
  AuditLog,
  Vehicle,
  ParkingSlot,
  ComplaintPriorityConfig,
  Vendor,
  AmcContract,
  Amenity,
  AmenityBooking,
  StaffMember,
  GuardShift,
  DutyRota,
  AdminUser,
  MenuMaster,
  RoleMenu,
  ResidentNotificationPreference,
  NotificationDelivery,
];

/**
 * Parses and determines whether database schema synchronization is enabled.
 * Production environment ALWAYS disables schema synchronization regardless of DB_SYNCHRONIZE.
 * In development/test, parses DB_SYNCHRONIZE case-insensitively ('true', '1' -> true; 'false', '0', undefined -> false).
 */
export function shouldSynchronize(): boolean {
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

export function getDatabaseLogging(): DataSourceOptions['logging'] {
  const isProduction = (process.env.NODE_ENV || 'development').trim().toLowerCase() === 'production';
  const logQueries = (process.env.DB_LOG_QUERIES || '').trim().toLowerCase() === 'true';
  return !isProduction && logQueries ? ['error', 'warn', 'query'] : ['error', 'warn'];
}

/**
 * Returns dynamic DataSourceOptions evaluated at call time.
 */
export function getDataSourceOptions(): DataSourceOptions {
  const sync = shouldSynchronize();
  const logging = getDatabaseLogging();

  if (process.env.DATABASE_URL) {
    const isSslDisabled = process.env.DATABASE_URL.includes('sslmode=disable');
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      synchronize: sync,
      logging,
      logger: new PushTokenSafeLogger(logging),
      entities: ENTITY_LIST,
      migrations: [__dirname + '/migrations/*.js'],
      subscribers: [],
      ssl: isSslDisabled
        ? false
        : {
            rejectUnauthorized: true,
          },
    };
  }

  if (process.env.DB_HOST && process.env.DB_USERNAME) {
    return {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'postgres',
      synchronize: sync,
      logging,
      logger: new PushTokenSafeLogger(logging),
      entities: ENTITY_LIST,
      migrations: [__dirname + '/migrations/*.js'],
      subscribers: [],
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: true },
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    username: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    synchronize: sync,
    logging,
    logger: new PushTokenSafeLogger(logging),
    entities: ENTITY_LIST,
    migrations: [__dirname + '/migrations/*.js'],
    subscribers: [],
    ssl: false,
  };
}

/**
 * Exported DataSourceOptions object supporting static entity inspection and dynamic synchronize getter.
 */
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  logger: new PushTokenSafeLogger(getDatabaseLogging()),
  ...(process.env.DATABASE_URL
    ? {
        url: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('sslmode=disable')
          ? false
          : { rejectUnauthorized: true },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        username: process.env.DB_USERNAME || '',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'postgres',
        ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: true },
      }),
  get synchronize(): boolean {
    return shouldSynchronize();
  },
  get logging(): DataSourceOptions['logging'] {
    return getDatabaseLogging();
  },
  entities: ENTITY_LIST,
  migrations: [__dirname + '/migrations/*.js'],
  subscribers: [],
} as DataSourceOptions;

export const initializeDataSource = async (): Promise<DataSource> => {
  const options = getDataSourceOptions();
  const dataSource = new DataSource(options);
  await dataSource.initialize();
  return dataSource;
};
