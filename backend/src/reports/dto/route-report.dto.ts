import { IsOptional, IsString, IsUUID } from 'class-validator';

export class RouteReportDto {
  @IsUUID()
  tradeUnitId: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}