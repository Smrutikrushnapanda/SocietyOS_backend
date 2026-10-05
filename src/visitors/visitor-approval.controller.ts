import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { VisitorApprovalService } from './visitor-approval.service';
import { VisitorApproval } from '../database/entities/visitor-approval.entity';
import { CreateVisitorApprovalDto } from './dto/create-visitor-approval.dto';
import { UpdateVisitorApprovalDto } from './dto/update-visitor-approval.dto';

@Controller('visitor-approvals')
@ApiTags('visitor-approvals')
export class VisitorApprovalController {
  constructor(
    private readonly visitorApprovalService: VisitorApprovalService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: VisitorApproval })
  async createVisitorApproval(
    @Body()
    createVisitorApprovalDto: CreateVisitorApprovalDto,
  ) {
    return this.visitorApprovalService.createVisitorApproval({
      organization_id: createVisitorApprovalDto.organization_id,
      visitor_visit_id: createVisitorApprovalDto.visitor_visit_id,
      approval_status: createVisitorApprovalDto.approval_status,
      approver_id: createVisitorApprovalDto.approver_id,
      approved_at: createVisitorApprovalDto.approved_at,
      rejected_at: createVisitorApprovalDto.rejected_at,
    });
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [VisitorApproval] })
  async findAllVisitorApprovals() {
    return this.visitorApprovalService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: VisitorApproval })
  async findVisitorApproval(@Param('id') id: string) {
    return this.visitorApprovalService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorApproval })
  async updateVisitorApproval(
    @Param('id') id: string,
    @Body()
    updateVisitorApprovalDto: UpdateVisitorApprovalDto,
  ) {
    return this.visitorApprovalService.update(id, updateVisitorApprovalDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorApproval })
  async removeVisitorApproval(@Param('id') id: string) {
    return this.visitorApprovalService.remove(id);
  }
}
