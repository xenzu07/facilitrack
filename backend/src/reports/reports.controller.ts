import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ListReportsDto } from './dto/list-reports.dto';

const UPLOAD_DIR = 'uploads';
if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const photoUpload = FileInterceptor('photo', {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new BadRequestException('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private reports: ReportsService) {}

  // any logged-in user: dropdown data
  @Get('options')
  options() {
    return this.reports.options();
  }

  @Roles(Role.REPORTER)
  @Post()
  @UseInterceptors(photoUpload)
  create(
    @Req() req: any,
    @Body() dto: CreateReportDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('A photo is required to submit a report');
    }
    return this.reports.create(req.user.userId, dto, file);
  }

  @Roles(Role.REPORTER)
  @Get('mine')
  mine(@Req() req: any) {
    return this.reports.findMine(req.user.userId);
  }

  @Roles(Role.COORDINATOR, Role.ADMIN)
  @Get()
  list(@Query() filters: ListReportsDto) {
    return this.reports.findAll(filters);
  }

  @Get(':id')
  one(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.reports.findOne(id, req.user);
  }
}