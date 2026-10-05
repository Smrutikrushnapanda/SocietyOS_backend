"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDataSource = exports.dataSourceOptions = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../database/entities/user.entity");
const role_entity_1 = require("../database/entities/role.entity");
const permission_entity_1 = require("../database/entities/permission.entity");
const role_permission_entity_1 = require("../database/entities/role-permission.entity");
const user_role_entity_1 = require("../database/entities/user-role.entity");
const organization_entity_1 = require("../database/entities/organization.entity");
const building_entity_1 = require("../database/entities/building.entity");
const floor_entity_1 = require("../database/entities/floor.entity");
const flat_entity_1 = require("../database/entities/flat.entity");
const resident_entity_1 = require("../database/entities/resident.entity");
const visitor_entity_1 = require("../database/entities/visitor.entity");
const visitor_visit_entity_1 = require("../database/entities/visitor-visit.entity");
const visitor_approval_entity_1 = require("../database/entities/visitor-approval.entity");
const visitor_pass_entity_1 = require("../database/entities/visitor-pass.entity");
const maintenance_configuration_entity_1 = require("../database/entities/maintenance-configuration.entity");
const maintenance_due_entity_1 = require("../database/entities/maintenance-due.entity");
const payment_entity_1 = require("../database/entities/payment.entity");
const complaint_entity_1 = require("../database/entities/complaint.entity");
const complaint_status_history_entity_1 = require("../database/entities/complaint-status-history.entity");
const notice_entity_1 = require("../database/entities/notice.entity");
const poll_entity_1 = require("../database/entities/poll.entity");
const poll_option_entity_1 = require("../database/entities/poll-option.entity");
const poll_vote_entity_1 = require("../database/entities/poll-vote.entity");
const notification_entity_1 = require("../database/entities/notification.entity");
const push_token_entity_1 = require("../database/entities/push-token.entity");
const file_metadata_entity_1 = require("../database/entities/file-metadata.entity");
const audit_entity_1 = require("../audit/audit.entity");
exports.dataSourceOptions = {
    type: 'postgres',
    host: 'ep-fancy-dawn-b3cnlcc1-pooler.c-4.ap-southeast-1.aws.neon.tech',
    port: 5432,
    username: 'neondb_owner',
    password: 'npg_EjPNQowvl60h',
    database: 'neondb',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: 'all',
    entities: [
        user_entity_1.User,
        role_entity_1.Role,
        permission_entity_1.Permission,
        role_permission_entity_1.RolePermission,
        user_role_entity_1.UserRole,
        organization_entity_1.Organization,
        building_entity_1.Building,
        floor_entity_1.Floor,
        flat_entity_1.Flat,
        resident_entity_1.Resident,
        visitor_entity_1.Visitor,
        visitor_visit_entity_1.VisitorVisit,
        visitor_approval_entity_1.VisitorApproval,
        visitor_pass_entity_1.VisitorPass,
        maintenance_configuration_entity_1.MaintenanceConfiguration,
        maintenance_due_entity_1.MaintenanceDue,
        payment_entity_1.Payment,
        complaint_entity_1.Complaint,
        complaint_status_history_entity_1.ComplaintStatusHistory,
        notice_entity_1.Notice,
        poll_entity_1.Poll,
        poll_option_entity_1.PollOption,
        poll_vote_entity_1.PollVote,
        notification_entity_1.Notification,
        push_token_entity_1.PushToken,
        file_metadata_entity_1.FileMetadata,
        audit_entity_1.AuditLog,
    ],
    migrations: [__dirname + '/migrations/*.js'],
    subscribers: [],
    ssl: {
        rejectUnauthorized: false,
    },
};
const initializeDataSource = async () => {
    const dataSource = new typeorm_1.DataSource(exports.dataSourceOptions);
    await dataSource.initialize();
    return dataSource;
};
exports.initializeDataSource = initializeDataSource;
//# sourceMappingURL=data-source.js.map