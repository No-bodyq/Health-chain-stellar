import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DisputeReasonTaxonomy, DisputeSeverity } from '../enums/dispute.enum';

export class OpenDisputeDto {
  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  paymentId?: string;

  @IsEnum(DisputeReasonTaxonomy)
  reason: DisputeReasonTaxonomy;

  @IsEnum(DisputeSeverity)
  @IsOptional()
  severity?: DisputeSeverity;

  @IsString()
  @IsOptional()
  description?: string;
}

export class ResolveDisputeDto {
  @IsString()
  resolutionNotes: string;
}

export class AddNoteDto {
  @IsString()
  content: string;
}

export class AssignDisputeDto {
  @IsString()
  operatorId: string;
}
