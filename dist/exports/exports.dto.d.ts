export declare class ExportDateRangeDto {
    from?: string;
    to?: string;
}
export declare class ResidentsExportQueryDto {
    kyc_status?: string;
    app_access?: string;
    active?: string;
    building_id?: string;
    floor_id?: string;
    flat_id?: string;
}
export declare class VisitorsExportQueryDto extends ExportDateRangeDto {
    visit_status?: string;
    visitor_id?: string;
}
export declare class MaintenanceDuesExportQueryDto extends ExportDateRangeDto {
    status?: string;
    flat_id?: string;
    building_id?: string;
    billing_period?: string;
    has_late_charge?: string;
}
export declare class PaymentsExportQueryDto extends ExportDateRangeDto {
    payment_status?: string;
    payment_method?: string;
    flat_id?: string;
    building_id?: string;
    resident_id?: string;
    maintenance_due_id?: string;
}
export declare class ComplaintsExportQueryDto extends ExportDateRangeDto {
    status?: string;
    priority?: string;
    category?: string;
    assigned_to?: string;
    flat_id?: string;
    building_id?: string;
}
export declare class NoticesExportQueryDto extends ExportDateRangeDto {
    status?: string;
}
export declare class PollsExportQueryDto extends ExportDateRangeDto {
    status?: string;
}
