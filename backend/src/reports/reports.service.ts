import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, Status, Urgency } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReportsDto } from './dto/list-reports.dto';
import { RouteReportDto } from './dto/route-report.dto';

const reportInclude = {
  category: true,
  location: true,
  proposedTradeUnit: true,
  photos: true,
  reporter: { select: { id: true, fullName: true, userType: true } },
  jobOrder: true,
  logs: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ReportInclude;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // dropdown data for the mobile report form
  async options() {
    const [categories, locations] = await Promise.all([
      this.prisma.issueCategory.findMany({
        include: { defaultTradeUnit: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.location.findMany({
        orderBy: [{ building: 'asc' }, { floor: 'asc' }, { room: 'asc' }],
      }),
    ]);
    return { categories, locations, urgencies: Object.values(Urgency) };
  }

  async create(
    userId: string,
    dto: CreateReportDto,
    file: Express.Multer.File,
  ) {
    const category = await this.prisma.issueCategory.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const location = await this.prisma.location.findUnique({
      where: { id: dto.locationId },
    });
    if (!location) throw new NotFoundException('Location not found');

    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: {
          reporterId: userId,
          locationId: dto.locationId,
          categoryId: dto.categoryId,
          // rule-based routing: category -> default trade unit
          proposedTradeUnitId: category.defaultTradeUnitId,
          description: dto.description,
          urgency: dto.urgency,
          photos: { create: [{ storageUrl: `/uploads/${file.filename}` }] },
        },
      });

      await tx.statusLog.create({
        data: {
          reportId: report.id,
          newStatus: Status.SUBMITTED,
          remarks: 'Report submitted',
          changedById: userId,
        },
      });

      return tx.report.findUnique({
        where: { id: report.id },
        include: reportInclude,
      });
    });
  }

  // coordinator confirms or changes the proposed trade unit
  async routeReport(id: string, userId: string, dto: RouteReportDto) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { jobOrder: true },
    });
    if (!report) throw new NotFoundException('Report not found');
    if (report.jobOrder) {
      throw new BadRequestException('A job order already exists for this report');
    }

    const unit = await this.prisma.tradeUnit.findUnique({
      where: { id: dto.tradeUnitId },
    });
    if (!unit) throw new NotFoundException('Trade unit not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id },
        data: { proposedTradeUnitId: unit.id, status: Status.UNDER_REVIEW },
      });
      await tx.statusLog.create({
        data: {
          reportId: id,
          oldStatus: report.status,
          newStatus: Status.UNDER_REVIEW,
          remarks: dto.remarks ?? `Routed to ${unit.name}`,
          changedById: userId,
        },
      });
      return tx.report.findUnique({ where: { id }, include: reportInclude });
    });
  }

  findMine(userId: string) {
    return this.prisma.report.findMany({
      where: { reporterId: userId },
      include: reportInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll(filters: ListReportsDto) {
    return this.prisma.report.findMany({
      where: {
        status: filters.status,
        urgency: filters.urgency,
        categoryId: filters.categoryId,
      },
      include: reportInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: { userId: string; role: Role }) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: reportInclude,
    });
    if (!report) throw new NotFoundException('Report not found');

    const isStaff = user.role === Role.COORDINATOR || user.role === Role.ADMIN;
    if (!isStaff && report.reporterId !== user.userId) {
      throw new ForbiddenException('You cannot view this report');
    }
    return report;
  }
}