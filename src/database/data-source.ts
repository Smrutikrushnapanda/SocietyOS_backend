import { DataSource, DataSourceOptions } from 'typeorm';
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
import { AuditLog } from '../audit/audit.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: 'ep-fancy-dawn-b3cnlcc1-pooler.c-4.ap-southeast-1.aws.neon.tech',
  port: 5432,
  username: 'neondb_owner',
  password: 'npg_EjPNQowvl60h',
  database: 'neondb',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: 'all',
  entities: [
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
    AuditLog,
  ],
  migrations: [__dirname + '/migrations/*.js'],
  subscribers: [],
  ssl: {
    rejectUnauthorized: false,
  },
};

export const initializeDataSource = async (): Promise<DataSource> => {
  const dataSource = new DataSource(dataSourceOptions);
  await dataSource.initialize();
  return dataSource;
};
