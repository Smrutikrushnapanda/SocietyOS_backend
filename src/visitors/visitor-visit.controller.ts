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
import { VisitorVisitService } from './visitor-visit.service';
import { VisitorVisit } from '../database/entities/visitor-visit.entity';
import { CreateVisitorVisitDto } from './dto/create-visitor-visit.dto';
import { UpdateVisitorVisitDto } from './dto/update-visitor-visit.dto';

@Controller('visitor-visits')
@ApiTags('visitor-visits')
export class VisitorVisitController {
  constructor(private readonly visitorVisitService: VisitorVisitService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: VisitorVisit })
  async createVisitorVisit(
    @Body()
    createVisitorVisitDto: CreateVisitorVisitDto,
  ) {
    return this.visitorVisitService.createVisitorVisit({
      organization_id: createVisitorVisitDto.organization_id,
      visitor_id: createVisitorVisitDto.visitor_id,
      visit_status: createVisitorVisitDto.visit_status,
      visit_purpose: createVisitorVisitDto.visit_purpose,
      expected_entry_time: createVisitorVisitDto.expected_entry_time,
    });
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [VisitorVisit] })
  async findAllVisitorVisits() {
    return this.visitorVisitService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: VisitorVisit })
  async findVisitorVisit(@Param('id') id: string) {
    return this.visitorVisitService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorVisit })
  async updateVisitorVisit(
    @Param('id') id: string,
    @Body()
    updateVisitorVisitDto: UpdateVisitorVisitDto,
  ) {
    return this.visitorVisitService.update(id, updateVisitorVisitDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorVisit })
  async removeVisitorVisit(@Param('id') id: string) {
    return this.visitorVisitService.remove(id);
  }
}
