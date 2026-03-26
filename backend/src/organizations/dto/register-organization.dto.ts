import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterOrganizationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  legalName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20)
  @Matches(/^\+?[0-9\s-]{10,20}$/, {
    message:
      'phone must be 10–20 characters (digits, optional +, spaces, hyphen)',
  })
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9/_-]+$/, {
    message: 'licenseNumber may only contain letters, digits, /, _, and -',
  })
  licenseNumber: string;
}
