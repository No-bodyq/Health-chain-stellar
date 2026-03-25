import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsString,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  IsIn,
  Min,
  Max,
  IsObject,
  Matches,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    if (!value) {
      return false;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date.getTime() > Date.now();
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid future date`;
  }
}

export class RegisterBloodUnitDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  bloodType: string;

  @IsInt()
  @Min(50)
  @Max(500)
  quantityMl: number;

  @IsString()
  @IsOptional()
  donorId?: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z2-7]{55}$/)
  bankId: string;

  @IsDateString()
  @Validate(IsFutureDateConstraint)
  expirationDate: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class BulkRegisterBloodUnitsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RegisterBloodUnitDto)
  @ArrayMaxSize(100)
  units: RegisterBloodUnitDto[];
}

export class TransferCustodyDto {
  @IsNumber()
  @IsNotEmpty()
  unitId: number;

  @IsString()
  @IsNotEmpty()
  fromAccount: string;

  @IsString()
  @IsNotEmpty()
  toAccount: string;

  @IsString()
  @IsNotEmpty()
  condition: string;
}

export class LogTemperatureDto {
  @IsNumber()
  @IsNotEmpty()
  unitId: number;

  @IsNumber()
  @Min(-50)
  @Max(50)
  temperature: number;

  @IsNumber()
  @IsOptional()
  timestamp?: number;

  @IsString()
  @IsOptional()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  bloodType?: string;
}
