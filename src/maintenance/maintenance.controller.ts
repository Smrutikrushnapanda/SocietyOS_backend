import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { MaintenanceConfigurationService } from './maintenance-configuration.service';
import { MaintenanceDueService } from './maintenance-due.service';
import { PaymentService } from './payment.service';
import { UpdateMaintenanceConfigurationDto } from './dto';
import { GenerateDueDto, WaiveLateChargeDto, CreatePaymentDto } from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import {
  RequirePermission,
  RequireOrganizationId,
} from '../authorization/require-permission.decorator';

@Controller('maintenance')
@UseGuards(AuthGuard, PermissionGuard)
export class MaintenanceController {
  constructor(
    private readonly configService: MaintenanceConfigurationService,
    private readonly dueService: MaintenanceDueService,
    private readonly paymentService: PaymentService,
  ) {}

  // GET /maintenance/config - Get org maintenance config
  @Get('config')
  @RequirePermission('maintenance:read')
  @RequireOrganizationId()
  async getConfig(@Request() req: any) {
    return this.configService.findOneByOrganization(
      req.orgContext.organizationId,
    );
  }

  // PUT /maintenance/config - Update maintenance config
  @Put('config')
  @RequirePermission('maintenance:manage')
  @RequireOrganizationId()
  async updateConfig(
    @Request() req: any,
    @Body() updateDto: UpdateMaintenanceConfigurationDto,
  ) {
    return this.configService.update(req.orgContext.organizationId, updateDto);
  }

  // POST /maintenance/dues - Generate a new due
  @Post('dues')
  @RequirePermission('maintenance:manage')
  @RequireOrganizationId()
  async generateDue(
    @Request() req: any,
    @Body() generateDueDto: GenerateDueDto,
  ) {
    return this.dueService.generateDue(
      generateDueDto.flat_id,
      generateDueDto.billing_period_start,
      generateDueDto.billing_period_end,
    );
  }

  // GET /maintenance/dues - List dues for org
  @Get('dues')
  @RequirePermission('due:read')
  @RequireOrganizationId()
  async getDues(@Request() req: any) {
    return this.dueService.findAllByOrganization();
  }

  // GET /maintenance/dues/:id - Get due detail
  @Get('dues/:id')
  @RequirePermission('due:read')
  @RequireOrganizationId()
  async getDue(@Request() req: any, @Param('id') dueId: string) {
    return this.dueService.findOne(dueId, req.orgContext);
  }

  // PATCH /maintenance/dues/:id/mark-paid - Mark due as paid
  @Patch('dues/:id/mark-paid')
  @RequirePermission('due:manage')
  @RequireOrganizationId()
  async markPaid(@Request() req: any, @Param('id') dueId: string) {
    return this.dueService.markPaid(dueId, req.orgContext);
  }

  // PATCH /maintenance/dues/:id/mark-overdue - Mark due as overdue
  @Patch('dues/:id/mark-overdue')
  @RequirePermission('due:manage')
  @RequireOrganizationId()
  async markOverdue(@Request() req: any, @Param('id') dueId: string) {
    return this.dueService.markOverdue(dueId, req.orgContext);
  }

  // POST /maintenance/dues/:id/waive-late-charge - Waive late charge
  @Post('dues/:id/waive-late-charge')
  @RequirePermission('late_charge:waive')
  @RequireOrganizationId()
  async waiveLateCharge(
    @Request() req: any,
    @Param('id') dueId: string,
    @Body() waiveDto: WaiveLateChargeDto,
  ) {
    return this.dueService.waiveLateCharge(dueId, req.user.id, waiveDto.reason);
  }

  // POST /payments - Create payment record
  @Post('payments')
  @RequirePermission('payment:manage')
  @RequireOrganizationId()
  async createPayment(
    @Request() req: any,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentService.create(createPaymentDto, req.user.id);
  }

  // GET /payments - List payments for org
  @Get('payments')
  @RequirePermission('payment:read')
  @RequireOrganizationId()
  async getPayments(@Request() req: any) {
    return this.paymentService.findAllByOrganization(
      req.orgContext.organizationId,
      req.orgContext,
    );
  }

  // GET /payments/:id - Get payment detail
  @Get('payments/:id')
  @RequirePermission('payment:read')
  @RequireOrganizationId()
  async getPayment(@Request() req: any, @Param('id') paymentId: string) {
    return this.paymentService.findOne(paymentId, req.orgContext);
  }

  // GET /payments/resident/:residentId - Get resident's payments
  @Get('payments/resident/:residentId')
  @RequirePermission('payment:read')
  @RequireOrganizationId()
  async getPaymentsByResident(
    @Request() req: any,
    @Param('residentId') residentId: string,
  ) {
    return this.paymentService.findAllByResident(residentId, req.orgContext);
  }

  // PATCH /payments/:id/mark-completed - Mark payment as completed
  @Patch('payments/:id/mark-completed')
  @RequirePermission('payment:manage')
  @RequireOrganizationId()
  async markPaymentCompleted(
    @Request() req: any,
    @Param('id') paymentId: string,
  ) {
    return this.paymentService.markCompleted(paymentId, req.orgContext);
  }

  // PATCH /payments/:id/mark-failed - Mark payment as failed
  @Patch('payments/:id/mark-failed')
  @RequirePermission('payment:manage')
  @RequireOrganizationId()
  async markPaymentFailed(@Request() req: any, @Param('id') paymentId: string) {
    return this.paymentService.markFailed(paymentId, req.orgContext);
  }
}
