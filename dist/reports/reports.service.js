"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const building_entity_1 = require("../database/entities/building.entity");
const floor_entity_1 = require("../database/entities/floor.entity");
const flat_entity_1 = require("../database/entities/flat.entity");
const resident_entity_1 = require("../database/entities/resident.entity");
const visitor_visit_entity_1 = require("../database/entities/visitor-visit.entity");
const visitor_approval_entity_1 = require("../database/entities/visitor-approval.entity");
const visitor_pass_entity_1 = require("../database/entities/visitor-pass.entity");
const maintenance_due_entity_1 = require("../database/entities/maintenance-due.entity");
const payment_entity_1 = require("../database/entities/payment.entity");
const complaint_entity_1 = require("../database/entities/complaint.entity");
const notice_entity_1 = require("../database/entities/notice.entity");
const poll_entity_1 = require("../database/entities/poll.entity");
const poll_option_entity_1 = require("../database/entities/poll-option.entity");
const poll_vote_entity_1 = require("../database/entities/poll-vote.entity");
const reports_dto_1 = require("./reports.dto");
const BILLING_PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
let ReportsService = class ReportsService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async getOccupancy(organizationId) {
        this.assertOrganization(organizationId);
        const buildings = await this.dataSource
            .getRepository(building_entity_1.Building)
            .createQueryBuilder('building')
            .where('building.organization_id = :organizationId', { organizationId })
            .orderBy('building.name', 'ASC')
            .getMany();
        const floorCountRows = await this.dataSource
            .getRepository(floor_entity_1.Floor)
            .createQueryBuilder('floor')
            .select('floor.building_id', 'building_id')
            .addSelect('COUNT(floor.id)', 'floor_count')
            .where('floor.organization_id = :organizationId', { organizationId })
            .groupBy('floor.building_id')
            .getRawMany();
        const flatCountRows = await this.dataSource
            .getRepository(flat_entity_1.Flat)
            .createQueryBuilder('flat')
            .select('flat.building_id', 'building_id')
            .addSelect('COUNT(flat.id)', 'total_flats')
            .addSelect('COUNT(DISTINCT occupied.flat_id)', 'occupied_flats')
            .leftJoin(resident_entity_1.Resident, 'occupied', 'occupied.flat_id = flat.id AND occupied.organization_id = flat.organization_id AND occupied.isActive = true')
            .where('flat.organization_id = :organizationId', { organizationId })
            .groupBy('flat.building_id')
            .getRawMany();
        const floorsByBuilding = new Map();
        for (const row of floorCountRows ?? []) {
            floorsByBuilding.set(row.building_id, Number(row.floor_count) || 0);
        }
        const flatsByBuilding = new Map();
        for (const row of flatCountRows ?? []) {
            flatsByBuilding.set(row.building_id, {
                total: Number(row.total_flats) || 0,
                occupied: Number(row.occupied_flats) || 0,
            });
        }
        const rows = buildings.map((building) => {
            const counts = flatsByBuilding.get(building.id) ?? { total: 0, occupied: 0 };
            const floors = floorsByBuilding.get(building.id) ?? 0;
            const vacant = Math.max(counts.total - counts.occupied, 0);
            return {
                id: building.id,
                name: building.name,
                code: building.code ?? null,
                is_active: building.isActive,
                floors,
                total_flats: counts.total,
                occupied_flats: counts.occupied,
                vacant_flats: vacant,
                occupancy_percentage: this.percentage(counts.occupied, counts.total),
            };
        });
        const totalFlats = rows.reduce((sum, row) => sum + row.total_flats, 0);
        const occupiedFlats = rows.reduce((sum, row) => sum + row.occupied_flats, 0);
        const totalFloors = rows.reduce((sum, row) => sum + row.floors, 0);
        return {
            buildings: rows,
            totals: {
                buildings: rows.length,
                floors: totalFloors,
                total_flats: totalFlats,
                occupied_flats: occupiedFlats,
                vacant_flats: Math.max(totalFlats - occupiedFlats, 0),
                occupancy_percentage: this.percentage(occupiedFlats, totalFlats),
            },
        };
    }
    async getResidents(organizationId, filters = new reports_dto_1.ResidentsReportQueryDto()) {
        const { page, limit, skip } = this.resolvePagination(filters);
        const query = this.buildResidentsQuery(organizationId, filters);
        query.orderBy('resident.createdAt', 'DESC').skip(skip).take(limit);
        const [rows, total] = await query.getManyAndCount();
        const items = rows.map((resident) => {
            const flat = resident.flat ?? null;
            return {
                resident_id: resident.id,
                kyc_status: resident.kyc_status,
                app_access_status: resident.app_access_status,
                is_active: resident.isActive,
                flat: resident.flat_id
                    ? {
                        id: resident.flat_id,
                        flat_identifier: flat?.flat_identifier ?? null,
                    }
                    : null,
                building: flat
                    ? { id: flat.building_id, name: flat.building?.name ?? null }
                    : null,
                floor: flat
                    ? { id: flat.floor_id, floor_number: flat.floor?.floor_number ?? null }
                    : null,
                created_at: resident.createdAt ?? null,
                updated_at: resident.updatedAt ?? null,
            };
        });
        return this.toPage(items, total, page, limit);
    }
    async fetchResidents(organizationId, filters = {}, maxRows) {
        const query = this.buildResidentsQuery(organizationId, filters);
        query
            .orderBy('resident.createdAt', 'DESC')
            .addOrderBy('resident.id', 'DESC')
            .take(maxRows + 1);
        return this.bounded(await query.getMany(), maxRows);
    }
    buildResidentsQuery(organizationId, filters) {
        this.assertOrganization(organizationId);
        const query = this.dataSource
            .getRepository(resident_entity_1.Resident)
            .createQueryBuilder('resident')
            .leftJoinAndSelect('resident.flat', 'flat')
            .leftJoinAndSelect('flat.building', 'building')
            .leftJoinAndSelect('flat.floor', 'floor')
            .where('resident.organization_id = :organizationId', { organizationId })
            .andWhere('(flat.id IS NULL OR flat.organization_id = :organizationId)');
        const kycStatus = this.parseEnumFilter(filters.kyc_status, reports_dto_1.RESIDENT_KYC_STATUSES, 'kyc_status');
        if (kycStatus) {
            query.andWhere('resident.kyc_status = :kycStatus', { kycStatus });
        }
        const appAccess = this.parseBooleanFilter(filters.app_access, 'app_access');
        if (appAccess !== undefined) {
            query.andWhere('resident.app_access_status = :appAccess', { appAccess });
        }
        const isActive = this.parseBooleanFilter(filters.active, 'active');
        if (isActive !== undefined) {
            query.andWhere('resident.isActive = :isActive', { isActive });
        }
        if (filters.flat_id) {
            query.andWhere('resident.flat_id = :flatId', { flatId: filters.flat_id });
        }
        if (filters.building_id) {
            query.andWhere('flat.building_id = :buildingId', {
                buildingId: filters.building_id,
            });
        }
        if (filters.floor_id) {
            query.andWhere('flat.floor_id = :floorId', { floorId: filters.floor_id });
        }
        return query;
    }
    async getVisitors(organizationId, filters = new reports_dto_1.VisitorsReportQueryDto()) {
        const { page, limit, skip } = this.resolvePagination(filters);
        const query = this.buildVisitorsQuery(organizationId, filters);
        query.orderBy('visit.createdAt', 'DESC').skip(skip).take(limit);
        const [rows, total] = await query.getManyAndCount();
        const { approvals, passes } = await this.loadVisitContext(organizationId, rows.map((visit) => visit.id));
        const items = rows.map((visit) => ({
            visit_id: visit.id,
            visitor: {
                id: visit.visitor.id,
                name: visit.visitor.name,
                mobile: visit.visitor.mobile,
            },
            visit_status: visit.visit_status,
            visit_purpose: visit.visit_purpose ?? null,
            expected_entry_time: visit.expected_entry_time ?? null,
            actual_entry_time: visit.actual_entry_time ?? null,
            approval_status: approvals.get(visit.id)?.approval_status ?? null,
            pass_status: passes.get(visit.id)?.pass_status ?? null,
            created_at: visit.createdAt ?? null,
            updated_at: visit.updatedAt ?? null,
        }));
        return this.toPage(items, total, page, limit);
    }
    async fetchVisitors(organizationId, filters = {}, maxRows) {
        const query = this.buildVisitorsQuery(organizationId, filters);
        query
            .orderBy('visit.createdAt', 'DESC')
            .addOrderBy('visit.id', 'DESC')
            .take(maxRows + 1);
        const fetched = await query.getMany();
        const visits = fetched.slice(0, maxRows);
        const truncated = fetched.length > maxRows;
        const { approvals, passes } = await this.loadVisitContext(organizationId, visits.map((visit) => visit.id));
        return { visits, approvals, passes, truncated };
    }
    buildVisitorsQuery(organizationId, filters) {
        this.assertOrganization(organizationId);
        const { from, to } = this.resolveDateRange(filters);
        const query = this.dataSource
            .getRepository(visitor_visit_entity_1.VisitorVisit)
            .createQueryBuilder('visit')
            .leftJoinAndSelect('visit.visitor', 'visitor')
            .where('visit.organization_id = :organizationId', { organizationId })
            .andWhere('visitor.organization_id = :organizationId');
        const visitStatus = this.parseEnumFilter(filters.visit_status, reports_dto_1.VISITOR_VISIT_STATUSES, 'visit_status');
        if (visitStatus) {
            query.andWhere('visit.visit_status = :visitStatus', { visitStatus });
        }
        if (filters.visitor_id) {
            query.andWhere('visit.visitor_id = :visitorId', {
                visitorId: filters.visitor_id,
            });
        }
        if (from) {
            query.andWhere('visit.createdAt >= :from', { from });
        }
        if (to) {
            query.andWhere('visit.createdAt <= :to', { to });
        }
        return query;
    }
    async loadVisitContext(organizationId, visitIds) {
        const approvals = new Map();
        const passes = new Map();
        if (visitIds.length > 0) {
            const approvalRows = await this.dataSource
                .getRepository(visitor_approval_entity_1.VisitorApproval)
                .createQueryBuilder('approval')
                .where('approval.organization_id = :organizationId', {
                organizationId,
            })
                .andWhere('approval.visitor_visit_id IN (:...visitIds)', { visitIds })
                .orderBy('approval.createdAt', 'DESC')
                .getMany();
            for (const approval of approvalRows) {
                if (!approvals.has(approval.visitor_visit_id)) {
                    approvals.set(approval.visitor_visit_id, approval);
                }
            }
            const passRows = await this.dataSource
                .getRepository(visitor_pass_entity_1.VisitorPass)
                .createQueryBuilder('pass')
                .where('pass.organization_id = :organizationId', { organizationId })
                .andWhere('pass.visitor_visit_id IN (:...visitIds)', { visitIds })
                .orderBy('pass.createdAt', 'DESC')
                .getMany();
            for (const pass of passRows) {
                if (pass.visitor_visit_id && !passes.has(pass.visitor_visit_id)) {
                    passes.set(pass.visitor_visit_id, pass);
                }
            }
        }
        return { approvals, passes };
    }
    async getMaintenanceDues(organizationId, filters = new reports_dto_1.MaintenanceDuesReportQueryDto()) {
        const { page, limit, skip } = this.resolvePagination(filters);
        const query = this.buildMaintenanceDuesQuery(organizationId, filters);
        query.orderBy('due.due_date', 'DESC').skip(skip).take(limit);
        const [rows, total] = await query.getManyAndCount();
        const items = rows.map((due) => ({
            due_id: due.id,
            status: due.status,
            flat: {
                id: due.flat_id,
                flat_identifier: due.flat?.flat_identifier ?? null,
            },
            building: due.flat
                ? { id: due.flat.building_id, name: due.flat.building?.name ?? null }
                : null,
            billing_period_start: due.billing_period_start ?? null,
            billing_period_end: due.billing_period_end ?? null,
            calculated_amount: due.calculated_amount,
            late_charge: due.late_charge,
            late_charge_waived: due.late_charge_waived,
            is_late_charge_waived: Number(due.late_charge_waived ?? 0) > 0,
            late_charge_waived_at: due.late_charge_waived_at ?? null,
            due_date: due.due_date ?? null,
            payment_received_at: due.payment_received_at ?? null,
            created_at: due.createdAt ?? null,
        }));
        return this.toPage(items, total, page, limit);
    }
    async fetchMaintenanceDues(organizationId, filters = {}, maxRows) {
        const query = this.buildMaintenanceDuesQuery(organizationId, filters);
        query
            .orderBy('due.due_date', 'DESC')
            .addOrderBy('due.id', 'DESC')
            .take(maxRows + 1);
        return this.bounded(await query.getMany(), maxRows);
    }
    buildMaintenanceDuesQuery(organizationId, filters) {
        this.assertOrganization(organizationId);
        const { from, to } = this.resolveDateRange(filters);
        const status = this.parseEnumFilter(filters.status, reports_dto_1.MAINTENANCE_DUE_STATUSES, 'status');
        const hasLateCharge = this.parseBooleanFilter(filters.has_late_charge, 'has_late_charge');
        if (filters.billing_period &&
            !BILLING_PERIOD_PATTERN.test(filters.billing_period)) {
            throw new common_1.BadRequestException('Invalid billing_period filter');
        }
        const query = this.dataSource
            .getRepository(maintenance_due_entity_1.MaintenanceDue)
            .createQueryBuilder('due')
            .leftJoinAndSelect('due.flat', 'flat')
            .leftJoinAndSelect('flat.building', 'building')
            .where('due.organization_id = :organizationId', { organizationId })
            .andWhere('(flat.id IS NULL OR flat.organization_id = :organizationId)');
        if (status) {
            query.andWhere('due.status = :status', { status });
        }
        if (filters.flat_id) {
            query.andWhere('due.flat_id = :flatId', { flatId: filters.flat_id });
        }
        if (filters.building_id) {
            query.andWhere('flat.building_id = :buildingId', {
                buildingId: filters.building_id,
            });
        }
        if (from) {
            query.andWhere('due.due_date >= :from', { from });
        }
        if (to) {
            query.andWhere('due.due_date <= :to', { to });
        }
        if (filters.billing_period) {
            query.andWhere('due.billing_period_start = :billingPeriodStart', {
                billingPeriodStart: `${filters.billing_period}-01`,
            });
        }
        if (hasLateCharge === true) {
            query.andWhere('due.late_charge > 0');
        }
        if (hasLateCharge === false) {
            query.andWhere('due.late_charge = 0');
        }
        return query;
    }
    async getPayments(organizationId, filters = new reports_dto_1.PaymentsReportQueryDto()) {
        const { page, limit, skip } = this.resolvePagination(filters);
        const query = this.buildPaymentsQuery(organizationId, filters);
        query.orderBy('payment.payment_date', 'DESC').skip(skip).take(limit);
        const [rows, total] = await query.getManyAndCount();
        const items = rows.map((payment) => ({
            payment_id: payment.id,
            amount: payment.amount,
            payment_method: payment.payment_method,
            payment_status: payment.payment_status,
            payment_date: payment.payment_date ?? null,
            transaction_id: payment.transaction_id ?? null,
            resident_id: payment.resident_id ?? null,
            flat: payment.flat_id
                ? {
                    id: payment.flat_id,
                    flat_identifier: payment.flat?.flat_identifier ?? null,
                }
                : null,
            building: payment.flat
                ? {
                    id: payment.flat.building_id,
                    name: payment.flat.building?.name ?? null,
                }
                : null,
            maintenance_due: payment.maintenance_due
                ? {
                    id: payment.maintenance_due.id,
                    status: payment.maintenance_due.status,
                    billing_period_start: payment.maintenance_due.billing_period_start ?? null,
                    billing_period_end: payment.maintenance_due.billing_period_end ?? null,
                }
                : null,
            created_at: payment.created_at ?? null,
        }));
        return this.toPage(items, total, page, limit);
    }
    async fetchPayments(organizationId, filters = {}, maxRows) {
        const query = this.buildPaymentsQuery(organizationId, filters);
        query
            .orderBy('payment.payment_date', 'DESC')
            .addOrderBy('payment.id', 'DESC')
            .take(maxRows + 1);
        return this.bounded(await query.getMany(), maxRows);
    }
    buildPaymentsQuery(organizationId, filters) {
        this.assertOrganization(organizationId);
        const { from, to } = this.resolveDateRange(filters);
        const paymentStatus = this.parseEnumFilter(filters.payment_status, reports_dto_1.PAYMENT_STATUSES, 'payment_status');
        const paymentMethod = this.parseEnumFilter(filters.payment_method, reports_dto_1.PAYMENT_METHODS, 'payment_method');
        const query = this.dataSource
            .getRepository(payment_entity_1.Payment)
            .createQueryBuilder('payment')
            .leftJoinAndSelect('payment.flat', 'flat')
            .leftJoinAndSelect('flat.building', 'building')
            .leftJoinAndSelect('payment.maintenance_due', 'due')
            .where('payment.organization_id = :organizationId', { organizationId })
            .andWhere('(flat.id IS NULL OR flat.organization_id = :organizationId)')
            .andWhere('(due.id IS NULL OR due.organization_id = :organizationId)');
        if (paymentStatus) {
            query.andWhere('payment.payment_status = :paymentStatus', {
                paymentStatus,
            });
        }
        if (paymentMethod) {
            query.andWhere('payment.payment_method = :paymentMethod', {
                paymentMethod,
            });
        }
        if (filters.flat_id) {
            query.andWhere('payment.flat_id = :flatId', { flatId: filters.flat_id });
        }
        if (filters.building_id) {
            query.andWhere('flat.building_id = :buildingId', {
                buildingId: filters.building_id,
            });
        }
        if (filters.resident_id) {
            query.andWhere('payment.resident_id = :residentId', {
                residentId: filters.resident_id,
            });
        }
        if (filters.maintenance_due_id) {
            query.andWhere('payment.maintenance_due_id = :maintenanceDueId', {
                maintenanceDueId: filters.maintenance_due_id,
            });
        }
        if (from) {
            query.andWhere('payment.payment_date >= :from', { from });
        }
        if (to) {
            query.andWhere('payment.payment_date <= :to', { to });
        }
        return query;
    }
    async getComplaints(organizationId, filters = new reports_dto_1.ComplaintsReportQueryDto()) {
        const { page, limit, skip } = this.resolvePagination(filters);
        const query = this.buildComplaintsQuery(organizationId, filters);
        query.orderBy('complaint.created_at', 'DESC').skip(skip).take(limit);
        const [rows, total] = await query.getManyAndCount();
        const items = rows.map((complaint) => ({
            complaint_id: complaint.id,
            category: complaint.category,
            subject: complaint.subject,
            status: complaint.status,
            priority: complaint.priority,
            resident_id: complaint.resident_id,
            assigned_to: complaint.assigned_to ?? null,
            flat: {
                id: complaint.flat_id,
                flat_identifier: complaint.flat?.flat_identifier ?? null,
            },
            building: complaint.flat
                ? {
                    id: complaint.flat.building_id,
                    name: complaint.flat.building?.name ?? null,
                }
                : null,
            created_at: complaint.created_at ?? null,
            resolved_at: complaint.resolved_at ?? null,
            updated_at: complaint.updated_at ?? null,
        }));
        return this.toPage(items, total, page, limit);
    }
    async fetchComplaints(organizationId, filters = {}, maxRows) {
        const query = this.buildComplaintsQuery(organizationId, filters);
        query
            .orderBy('complaint.created_at', 'DESC')
            .addOrderBy('complaint.id', 'DESC')
            .take(maxRows + 1);
        return this.bounded(await query.getMany(), maxRows);
    }
    buildComplaintsQuery(organizationId, filters) {
        this.assertOrganization(organizationId);
        const { from, to } = this.resolveDateRange(filters);
        const status = this.parseEnumFilter(filters.status, reports_dto_1.COMPLAINT_STATUSES, 'status');
        const priority = this.parseEnumFilter(filters.priority, reports_dto_1.COMPLAINT_PRIORITIES, 'priority');
        const query = this.dataSource
            .getRepository(complaint_entity_1.Complaint)
            .createQueryBuilder('complaint')
            .leftJoinAndSelect('complaint.flat', 'flat')
            .leftJoinAndSelect('flat.building', 'building')
            .where('complaint.organization_id = :organizationId', { organizationId })
            .andWhere('(flat.id IS NULL OR flat.organization_id = :organizationId)');
        if (status) {
            query.andWhere('complaint.status = :status', { status });
        }
        if (priority) {
            query.andWhere('complaint.priority = :priority', { priority });
        }
        if (filters.category) {
            query.andWhere('complaint.category = :category', {
                category: filters.category,
            });
        }
        if (filters.assigned_to) {
            query.andWhere('complaint.assigned_to = :assignedTo', {
                assignedTo: filters.assigned_to,
            });
        }
        if (filters.flat_id) {
            query.andWhere('complaint.flat_id = :flatId', { flatId: filters.flat_id });
        }
        if (filters.building_id) {
            query.andWhere('flat.building_id = :buildingId', {
                buildingId: filters.building_id,
            });
        }
        if (from) {
            query.andWhere('complaint.created_at >= :from', { from });
        }
        if (to) {
            query.andWhere('complaint.created_at <= :to', { to });
        }
        return query;
    }
    async getNotices(organizationId, filters = new reports_dto_1.NoticesReportQueryDto()) {
        const { page, limit, skip } = this.resolvePagination(filters);
        const query = this.buildNoticesQuery(organizationId, filters);
        query.orderBy('notice.created_at', 'DESC').skip(skip).take(limit);
        const [rows, total] = await query.getManyAndCount();
        const items = rows.map((notice) => ({
            notice_id: notice.id,
            title: notice.title,
            status: notice.status,
            published_at: notice.published_at ?? null,
            created_at: notice.created_at ?? null,
            updated_at: notice.updated_at ?? null,
        }));
        return this.toPage(items, total, page, limit);
    }
    async fetchNotices(organizationId, filters = {}, maxRows) {
        const query = this.buildNoticesQuery(organizationId, filters);
        query
            .orderBy('notice.created_at', 'DESC')
            .addOrderBy('notice.id', 'DESC')
            .take(maxRows + 1);
        return this.bounded(await query.getMany(), maxRows);
    }
    buildNoticesQuery(organizationId, filters) {
        this.assertOrganization(organizationId);
        const { from, to } = this.resolveDateRange(filters);
        const status = this.parseEnumFilter(filters.status, reports_dto_1.NOTICE_STATUSES, 'status');
        const query = this.dataSource
            .getRepository(notice_entity_1.Notice)
            .createQueryBuilder('notice')
            .where('notice.organization_id = :organizationId', { organizationId });
        if (status) {
            query.andWhere('notice.status = :status', { status });
        }
        if (from) {
            query.andWhere('notice.created_at >= :from', { from });
        }
        if (to) {
            query.andWhere('notice.created_at <= :to', { to });
        }
        return query;
    }
    async getPolls(organizationId, filters = new reports_dto_1.PollsReportQueryDto()) {
        const { page, limit, skip } = this.resolvePagination(filters);
        const query = this.buildPollsQuery(organizationId, filters);
        query.orderBy('poll.created_at', 'DESC').skip(skip).take(limit);
        const [rows, total] = await query.getManyAndCount();
        const optionCountRows = await this.loadPollOptionCounts(organizationId, rows.map((poll) => poll.id));
        const items = rows.map((poll) => {
            const options = this.mapPollOptions(optionCountRows, poll.id);
            const totalVotes = options.reduce((sum, option) => sum + option.vote_count, 0);
            return {
                poll_id: poll.id,
                title: poll.title,
                status: poll.status,
                starts_at: poll.starts_at ?? null,
                ends_at: poll.ends_at ?? null,
                created_at: poll.created_at ?? null,
                updated_at: poll.updated_at ?? null,
                total_votes: totalVotes,
                options: options.map((option) => ({
                    ...option,
                    percentage: this.percentage(option.vote_count, totalVotes),
                })),
            };
        });
        return this.toPage(items, total, page, limit);
    }
    async fetchPolls(organizationId, filters = {}, maxRows) {
        const query = this.buildPollsQuery(organizationId, filters);
        query
            .orderBy('poll.created_at', 'DESC')
            .addOrderBy('poll.id', 'DESC')
            .take(maxRows + 1);
        const fetched = await query.getMany();
        const polls = fetched.slice(0, maxRows);
        const optionRows = await this.loadPollOptionCounts(organizationId, polls.map((poll) => poll.id));
        return { polls, optionRows, truncated: fetched.length > maxRows };
    }
    buildPollsQuery(organizationId, filters) {
        this.assertOrganization(organizationId);
        const { from, to } = this.resolveDateRange(filters);
        const status = this.parseEnumFilter(filters.status, reports_dto_1.POLL_STATUSES, 'status');
        const query = this.dataSource
            .getRepository(poll_entity_1.Poll)
            .createQueryBuilder('poll')
            .where('poll.organization_id = :organizationId', { organizationId });
        if (status) {
            query.andWhere('poll.status = :status', { status });
        }
        if (from) {
            query.andWhere('poll.created_at >= :from', { from });
        }
        if (to) {
            query.andWhere('poll.created_at <= :to', { to });
        }
        return query;
    }
    async loadPollOptionCounts(organizationId, pollIds) {
        if (pollIds.length === 0) {
            return [];
        }
        return this.dataSource
            .getRepository(poll_option_entity_1.PollOption)
            .createQueryBuilder('option')
            .select('option.id', 'option_id')
            .addSelect('option.poll_id', 'poll_id')
            .addSelect('option.option_text', 'option_text')
            .addSelect('option.display_order', 'display_order')
            .addSelect('COUNT(vote.id)', 'vote_count')
            .leftJoin(poll_vote_entity_1.PollVote, 'vote', 'vote.option_id = option.id AND vote.organization_id = :organizationId')
            .where('option.organization_id = :organizationId', { organizationId })
            .andWhere('option.poll_id IN (:...pollIds)', { pollIds })
            .groupBy('option.id')
            .orderBy('option.display_order', 'ASC')
            .getRawMany();
    }
    mapPollOptions(optionCountRows, pollId) {
        return (optionCountRows ?? [])
            .filter((row) => row.poll_id === pollId)
            .map((row) => ({
            option_id: row.option_id,
            option_text: row.option_text,
            display_order: Number(row.display_order) || 0,
            vote_count: Number(row.vote_count) || 0,
        }));
    }
    assertOrganization(organizationId) {
        if (!organizationId) {
            throw new common_1.ForbiddenException('Organization context is required');
        }
    }
    parseEnumFilter(value, allowed, field) {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        if (!allowed.includes(value)) {
            throw new common_1.BadRequestException(`Invalid ${field} filter`);
        }
        return value;
    }
    parseBooleanFilter(value, field) {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        if (value === 'true') {
            return true;
        }
        if (value === 'false') {
            return false;
        }
        throw new common_1.BadRequestException(`Invalid ${field} filter`);
    }
    parseDateFilter(value, field) {
        if (value === undefined || value === null || value === '') {
            return undefined;
        }
        if (!ISO_DATE_PATTERN.test(value)) {
            throw new common_1.BadRequestException(`Invalid ${field} filter`);
        }
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new common_1.BadRequestException(`Invalid ${field} filter`);
        }
        return parsed;
    }
    resolveDateRange(filters) {
        const from = this.parseDateFilter(filters?.from, 'from');
        const to = this.parseDateFilter(filters?.to, 'to');
        if (from && to && from.getTime() > to.getTime()) {
            throw new common_1.BadRequestException('Invalid date range: from must not be after to');
        }
        return { from, to };
    }
    resolvePagination(filters) {
        const page = this.parsePositiveInt(filters?.page, 1);
        const limit = this.parsePositiveInt(filters?.limit, reports_dto_1.REPORT_DEFAULT_PAGE_SIZE, reports_dto_1.REPORT_MAX_PAGE_SIZE);
        return { page, limit, skip: (page - 1) * limit };
    }
    parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
        if (value === undefined || value === null || value === '') {
            return fallback;
        }
        const parsed = Number.parseInt(String(value), 10);
        if (Number.isNaN(parsed)) {
            return fallback;
        }
        return Math.min(Math.max(parsed, 1), max);
    }
    bounded(rows, maxRows) {
        const list = rows ?? [];
        if (list.length > maxRows) {
            return { rows: list.slice(0, maxRows), truncated: true };
        }
        return { rows: list, truncated: false };
    }
    percentage(part, total) {
        if (!total || total <= 0) {
            return 0;
        }
        return Math.round((part / total) * 1000) / 10;
    }
    toPage(items, total, page, limit) {
        return {
            items,
            total,
            page,
            limit,
            totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], ReportsService);
//# sourceMappingURL=reports.service.js.map