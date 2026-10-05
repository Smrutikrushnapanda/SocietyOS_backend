"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePaymentDto = exports.WaiveLateChargeDto = exports.GenerateDueDto = exports.UpdateMaintenanceConfigurationDto = exports.CreateMaintenanceConfigurationDto = void 0;
class CreateMaintenanceConfigurationDto {
    organization_id;
    base_maintenance_amount;
    due_day_of_month;
    late_charge_type;
    late_charge_value;
    late_charge_grace_days;
}
exports.CreateMaintenanceConfigurationDto = CreateMaintenanceConfigurationDto;
class UpdateMaintenanceConfigurationDto {
    base_maintenance_amount;
    due_day_of_month;
    late_charge_type;
    late_charge_value;
    late_charge_grace_days;
    is_active;
}
exports.UpdateMaintenanceConfigurationDto = UpdateMaintenanceConfigurationDto;
class GenerateDueDto {
    flat_id;
    billing_period_start;
    billing_period_end;
}
exports.GenerateDueDto = GenerateDueDto;
class WaiveLateChargeDto {
    due_id;
    reason;
}
exports.WaiveLateChargeDto = WaiveLateChargeDto;
class CreatePaymentDto {
    organization_id;
    resident_id;
    flat_id;
    maintenance_due_id;
    amount;
    payment_method;
}
exports.CreatePaymentDto = CreatePaymentDto;
//# sourceMappingURL=dto.js.map