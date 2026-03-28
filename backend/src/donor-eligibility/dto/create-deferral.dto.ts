import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { DeferralReason } from '../enums/eligibility.enum';

export class CreateDeferralDto {
  @IsString()
  donorId: string;

  @IsEnum(DeferralReason)
  reason: DeferralReason;

  @IsDateString()
  @IsOptional()
  deferredUntil?: string; // omit for permanent

  @IsString()
  @IsOptional()
  notes?: string;
}
