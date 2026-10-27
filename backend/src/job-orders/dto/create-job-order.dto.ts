import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateJobOrderDto {
  @IsUUID()
  reportId: string;

  // defaults to the report's proposed trade unit
  @IsOptional()
  @IsUUID()
  tradeUnitId?: string;

  @IsOptional()
  @IsUUID()
  technicianId?: string;

  // left empty when unknown; the system never invents these
  @IsOptional()
  @IsString()
  materialsNote?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;
}