import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Status, Urgency } from '@prisma/client';

export class ListReportsDto {
  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsEnum(Urgency)
  urgency?: Urgency;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}