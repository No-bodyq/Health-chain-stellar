import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

export class SurgeSimulationRequestDto {
  @ApiProperty({
    description: 'Additional blood units demanded in the surge scenario',
    example: 500,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  surgeDemandUnits!: number;

  @ApiPropertyOptional({
    description:
      'Override total stock (sum of inventory rows). When omitted, uses database totals.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  overrideStockUnits?: number;

  @ApiPropertyOptional({
    description:
      'Override concurrent rider delivery capacity (units). When omitted, derived from active riders.',
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  overrideRiderCapacityUnits?: number;

  @ApiPropertyOptional({
    description: 'Assumed blood units one rider can carry per run (default 4)',
    default: 4,
  })
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(32)
  unitsPerRider?: number;
}
