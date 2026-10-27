import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role, Status } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { JobOrdersService } from './job-orders.service';
import { CreateJobOrderDto } from './dto/create-job-order.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';

@Controller('job-orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobOrdersController {
  constructor(private jobs: JobOrdersService) {}

  @Roles(Role.COORDINATOR, Role.ADMIN)
  @Post()
  create(@Req() req: any, @Body() dto: CreateJobOrderDto) {
    return this.jobs.create(req.user.userId, dto);
  }

  // technicians for the dashboard's "assign technician" dropdown
  @Roles(Role.COORDINATOR, Role.ADMIN)
  @Get('technicians')
  technicians(
    @Query('tradeUnitId', new ParseUUIDPipe({ optional: true }))
    tradeUnitId?: string,
  ) {
    return this.jobs.listTechnicians(tradeUnitId);
  }

  @Roles(Role.TECHNICIAN)
  @Get('assigned')
  assigned(@Req() req: any) {
    return this.jobs.findAssigned(req.user.userId);
  }

  @Roles(Role.COORDINATOR, Role.ADMIN)
  @Get()
  list(
    @Query('status', new ParseEnumPipe(Status, { optional: true }))
    status?: Status,
  ) {
    return this.jobs.findAll(status);
  }

  @Get(':id')
  one(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.jobs.findOne(id, req.user);
  }

  @Roles(Role.COORDINATOR, Role.ADMIN)
  @Patch(':id/technician')
  assignTechnician(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: AssignTechnicianDto,
  ) {
    return this.jobs.assignTechnician(id, req.user.userId, dto);
  }

  @Roles(Role.TECHNICIAN)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: UpdateJobStatusDto,
  ) {
    return this.jobs.updateStatus(id, req.user.userId, dto);
  }
}