import { MaintenanceConfigurationService } from './maintenance-configuration.service';
import { MaintenanceDueService } from './maintenance-due.service';
import { PaymentService } from './payment.service';
import { UpdateMaintenanceConfigurationDto } from './dto';
import { GenerateDueDto, WaiveLateChargeDto, CreatePaymentDto } from './dto';
export declare class MaintenanceController {
    private readonly configService;
    private readonly dueService;
    private readonly paymentService;
    constructor(configService: MaintenanceConfigurationService, dueService: MaintenanceDueService, paymentService: PaymentService);
    getConfig(req: any): Promise<import("../database/entities/maintenance-configuration.entity").MaintenanceConfiguration | null>;
    updateConfig(req: any, updateDto: UpdateMaintenanceConfigurationDto): Promise<import("../database/entities/maintenance-configuration.entity").MaintenanceConfiguration>;
    generateDue(req: any, generateDueDto: GenerateDueDto): Promise<import("../database/entities/maintenance-due.entity").MaintenanceDue>;
    getDues(req: any): Promise<import("../database/entities/maintenance-due.entity").MaintenanceDue[]>;
    getDue(req: any, dueId: string): Promise<import("../database/entities/maintenance-due.entity").MaintenanceDue>;
    markPaid(req: any, dueId: string): Promise<import("../database/entities/maintenance-due.entity").MaintenanceDue>;
    markOverdue(req: any, dueId: string): Promise<import("../database/entities/maintenance-due.entity").MaintenanceDue>;
    waiveLateCharge(req: any, dueId: string, waiveDto: WaiveLateChargeDto): Promise<import("../database/entities/maintenance-due.entity").MaintenanceDue>;
    createPayment(req: any, createPaymentDto: CreatePaymentDto): Promise<import("../database/entities/payment.entity").Payment>;
    getPayments(req: any): Promise<import("../database/entities/payment.entity").Payment[]>;
    getPayment(req: any, paymentId: string): Promise<import("../database/entities/payment.entity").Payment>;
    getPaymentsByResident(req: any, residentId: string): Promise<import("../database/entities/payment.entity").Payment[]>;
    markPaymentCompleted(req: any, paymentId: string): Promise<import("../database/entities/payment.entity").Payment>;
    markPaymentFailed(req: any, paymentId: string): Promise<import("../database/entities/payment.entity").Payment>;
}
