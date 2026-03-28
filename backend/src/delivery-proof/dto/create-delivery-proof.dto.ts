import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateDeliveryProofDto {
  @IsString()
  orderId: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsString()
  riderId: string;

  @IsDateString()
  pickupTimestamp: string;

  @IsOptional()
  @IsString()
  pickupLocationHash?: string;

  @IsDateString()
  deliveredAt: string;

  @IsOptional()
  @IsString()
  deliveryLocationHash?: string;

  @IsString()
  recipientName: string;

  @IsOptional()
  @IsString()
  recipientSignatureUrl?: string;

  @IsOptional()
  @IsString()
  recipientSignatureHash?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoHashes?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  @Type(() => Number)
  temperatureReadings: number[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  temperatureCelsius?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
