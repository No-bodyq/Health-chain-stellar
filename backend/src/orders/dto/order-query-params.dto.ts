import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsIn,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderQueryParamsDto {
  @IsString()
  hospitalId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  bloodTypes?: string; // Comma-separated values

  @IsOptional()
  @IsString()
  statuses?: string; // Comma-separated values

  @IsOptional()
  @IsString()
  bloodBank?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([25, 50, 100])
  pageSize?: number;
}
