import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';
import { Urgency } from '@prisma/client';

export class CreateReportDto {
  @IsUUID()
  locationId: string;

  @IsUUID()
  categoryId: string;

  @IsEnum(Urgency)
  urgency: Urgency;

  @IsString()
  @MinLength(5)
  description: string;
}