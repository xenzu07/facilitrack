import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobOrderDto } from './dto/create-job-order.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';

const jobInclude = {
  tradeUnit: true,
  technician: { select: { id: true, fullName: true } },
  report: {
    include: {
      category: true,
      location: true,
      photos: true,
      reporter: { select: { id: true, fullName: true, userType: true } },
      logs: { orderBy: { createdAt: 'asc' } },
    },
  },
} satisfies Prisma.JobOrderInclude;

const NEXT_STATUS: Partial<Record<Status, Status[]>> = {
  [Status.ASSIGNED]: [Status.IN_PROGRESS],
  [Status.IN_PROGRESS]: [Status.COMPLETED],
};

@Injectable()
export class JobOrdersService {
  constructor(private prisma: PrismaService) {}

  private async assertTechnician(technicianId: string, tradeUnitId: string) {
    const tech = await this.prisma.user.findUnique({ where: { id: technicianId } });
    if (!tech || tech.role !== Role.TECHNICIAN || !tech.isActive) {
      throw new BadRequestException('Technician not found or inactive');
    }
    if (tech.tradeUnitId !== tradeUnitId) {
      throw new BadRequestException(
        'Technician does not belong to the selected trade unit',
      );
    }
    return tech;
  }

  listTechnicians(tradeUnitId?: string) {
    return this.prisma.user.findMany({
      where: { role: Role.TECHNICIAN, isActive: true, tradeUnitId },
      select: {
        id: true,
        fullName: true,
        tradeUnit: { select: { id: true, name: true } },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(userId: string, dto: CreateJobOrderDto) {
    const report = await this.prisma.report.findUnique({
      where: { id: dto.reportId },
      include: { jobOrder: true },
    });
    if (!report) throw new NotFoundException('Report not found');
    if (report.jobOrder) {
      throw new ConflictException('A job order already exists for this report');
    }
    if (report.status !== Status.SUBMITTED && report.status !== Status.UNDER_REVIEW) {
      throw new BadRequestException('This report can no longer receive a job order');
    }

    const tradeUnitId = dto.tradeUnitId ?? report.proposedTradeUnitId;
    const unit = await this.prisma.tradeUnit.findUnique({ where: { id: tradeUnitId } });
    if (!unit) throw new NotFoundException('Trade unit not found');

    const tech = dto.technicianId
      ? await this.assertTechnician(dto.technicianId, tradeUnitId)
      : null;

    // retry if two coordinators generate a number at the same moment
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const prefix = `JO-${new Date().getFullYear()}-`;
          const last = await tx.jobOrder.findFirst({
            where: { jobOrderNo: { startsWith: prefix } },
            orderBy: { jobOrderNo: 'desc' },
          });
          const next = last ? parseInt(last.jobOrderNo.slice(prefix.length), 10) + 1 : 1;
          const jobOrderNo = `${prefix}${String(next).padStart(4, '0')}`;

          const job = await tx.jobOrder.create({
            data: {
              jobOrderNo,
              reportId: report.id,
              tradeUnitId,
              technicianId: tech?.id ?? null,
              materialsNote: dto.materialsNote ?? null,
              targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
              createdById: userId,
            },
          });

          await tx.report.update({
            where: { id: report.id },
            data: { status: Status.ASSIGNED },
          });

          await tx.statusLog.create({
            data: {
              reportId: report.id,
              oldStatus: report.status,
              newStatus: Status.ASSIGNED,
              remarks:
                `Job order ${jobOrderNo} created for ${unit.name}` +
                (tech ? `, assigned to ${tech.fullName}` : ''),
              changedById: userId,
            },
          });

          return tx.jobOrder.findUnique({
            where: { id: job.id },
            include: jobInclude,
          });
        });
      } catch (e) {
        const isCollision =
          e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
        if (!isCollision || attempt === 2) throw e;
      }
    }
    throw new ConflictException('Could not generate a job order number, try again');
  }

  findAll(status?: Status) {
    return this.prisma.jobOrder.findMany({
      where: { status },
      include: jobInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findAssigned(technicianId: string) {
    return this.prisma.jobOrder.findMany({
      where: { technicianId },
      include: jobInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: { userId: string; role: Role }) {
    const job = await this.prisma.jobOrder.findUnique({
      where: { id },
      include: jobInclude,
    });
    if (!job) throw new NotFoundException('Job order not found');

    const isStaff = user.role === Role.COORDINATOR || user.role === Role.ADMIN;
    const isOwnTechnician =
      user.role === Role.TECHNICIAN && job.technicianId === user.userId;
    const isOwnReporter =
      user.role === Role.REPORTER && job.report.reporterId === user.userId;

    if (!isStaff && !isOwnTechnician && !isOwnReporter) {
      throw new ForbiddenException('You cannot view this job order');
    }
    return job;
  }

  async assignTechnician(id: string, userId: string, dto: AssignTechnicianDto) {
    const job = await this.prisma.jobOrder.findUnique({
      where: { id },
      include: { technician: { select: { id: true, fullName: true } } },
    });
    if (!job) throw new NotFoundException('Job order not found');
    if (job.status !== Status.ASSIGNED) {
      throw new BadRequestException('Technician can only be changed before work starts');
    }
    if (job.technicianId === dto.technicianId) {
      throw new BadRequestException('This technician is already assigned to the job');
    }
    const tech = await this.assertTechnician(dto.technicianId, job.tradeUnitId);

    const remarks = job.technician
      ? `Technician reassigned from ${job.technician.fullName} to ${tech.fullName}`
      : `Technician assigned: ${tech.fullName}`;

    return this.prisma.$transaction(async (tx) => {
      await tx.jobOrder.update({
        where: { id },
        data: { technicianId: tech.id },
      });
      await tx.statusLog.create({
        data: {
          reportId: job.reportId,
          oldStatus: Status.ASSIGNED,
          newStatus: Status.ASSIGNED,
          remarks,
          changedById: userId,
        },
      });
      return tx.jobOrder.findUnique({ where: { id }, include: jobInclude });
    });
  }

  async updateStatus(id: string, userId: string, dto: UpdateJobStatusDto) {
    const job = await this.prisma.jobOrder.findUnique({ where: { id } });
    if (!job) throw new NotFoundException('Job order not found');
    if (job.technicianId !== userId) {
      throw new ForbiddenException('This job is not assigned to you');
    }

    const allowed = NEXT_STATUS[job.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot change status from ${job.status} to ${dto.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.jobOrder.update({ where: { id }, data: { status: dto.status } });
      await tx.report.update({
        where: { id: job.reportId },
        data: { status: dto.status },
      });
      await tx.statusLog.create({
        data: {
          reportId: job.reportId,
          oldStatus: job.status,
          newStatus: dto.status,
          remarks: dto.remarks ?? null,
          changedById: userId,
        },
      });
      return tx.jobOrder.findUnique({ where: { id }, include: jobInclude });
    });
  }
}