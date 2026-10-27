import { IsIn, IsOptional, IsString } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateJobStatusDto {
  @IsIn([Status.IN_PROGRESS, Status.COMPLETED])
  status: Status;

  @IsOptional()
  @IsString()
  remarks?: string;
}