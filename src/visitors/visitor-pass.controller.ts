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
import { VisitorPassService } from './visitor-pass.service';
import { VisitorPass } from '../database/entities/visitor-pass.entity';
import { CreateVisitorPassDto } from './dto/create-visitor-pass.dto';
import { UpdateVisitorPassDto } from './dto/update-visitor-pass.dto';

@Controller('visitor-passes')
@ApiTags('visitor-passes')
export class VisitorPassController {
  constructor(private readonly visitorPassService: VisitorPassService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: VisitorPass })
  async createVisitorPass(
    @Body()
    createVisitorPassDto: CreateVisitorPassDto,
  ) {
    return this.visitorPassService.createVisitorPass({
      organization_id: createVisitorPassDto.organization_id,
      visitor_id: createVisitorPassDto.visitor_id,
      visitor_visit_id: createVisitorPassDto.visitor_visit_id,
      issuer: createVisitorPassDto.issuer,
      pass_status: createVisitorPassDto.pass_status,
      validity_start: createVisitorPassDto.validity_start,
      validity_end: createVisitorPassDto.validity_end,
    });
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [VisitorPass] })
  async findAllVisitorPasses() {
    return this.visitorPassService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: VisitorPass })
  async findVisitorPass(@Param('id') id: string) {
    return this.visitorPassService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorPass })
  async updateVisitorPass(
    @Param('id') id: string,
    @Body()
    updateVisitorPassDto: UpdateVisitorPassDto,
  ) {
    return this.visitorPassService.update(id, updateVisitorPassDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: VisitorPass })
  async removeVisitorPass(@Param('id') id: string) {
    return this.visitorPassService.remove(id);
  }
}
