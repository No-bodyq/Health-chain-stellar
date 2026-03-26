import { Transform } from 'class-transformer';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UssdSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  serviceCode: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsString()
  @Transform(({ value }) => value ?? '')
  text: string;

  @IsOptional()
  @IsString()
  networkCode?: string;

  @IsOptional()
  @IsString()
  operator?: string;
}
