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
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { VisitorService } from './visitor.service';
import { Visitor } from '../database/entities/visitor.entity';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';

@Controller('visitors')
@ApiTags('visitors')
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: HttpStatus.CREATED, type: Visitor })
  async createVisitor(
    @Body()
    createVisitorDto: CreateVisitorDto,
  ) {
    return this.visitorService.createVisitor({
      organization_id: createVisitorDto.organization_id,
      name: createVisitorDto.name,
      mobile: createVisitorDto.mobile,
      active: createVisitorDto.active,
    });
  }

  @Get()
  @ApiResponse({ status: HttpStatus.OK, type: [Visitor] })
  async findAllVisitors() {
    return this.visitorService.findAll();
  }

  @Get(':id')
  @ApiResponse({ status: HttpStatus.OK, type: Visitor })
  async findVisitor(@Param('id') id: string) {
    return this.visitorService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Visitor })
  async updateVisitor(
    @Param('id') id: string,
    @Body()
    updateVisitorDto: UpdateVisitorDto,
  ) {
    return this.visitorService.update(id, updateVisitorDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: HttpStatus.OK, type: Visitor })
  async removeVisitor(@Param('id') id: string) {
    return this.visitorService.remove(id);
  }
}
