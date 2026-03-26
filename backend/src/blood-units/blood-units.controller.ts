import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';

import { Request } from 'express';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

import { BloodUnitsService } from './blood-units.service';
import {
  BulkRegisterBloodUnitsDto,
  RegisterBloodUnitDto,
  TransferCustodyDto,
  LogTemperatureDto,
} from './dto/blood-units.dto';

@Controller('blood-units')
export class BloodUnitsController {
  constructor(private readonly bloodUnitsService: BloodUnitsService) {}

  @RequirePermissions(Permission.REGISTER_BLOOD_UNIT)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async registerBloodUnit(
    @Body() dto: RegisterBloodUnitDto,
    @Req()
    request: Request & {
      user?: {
        id: string;
        role: string;
      };
    },
  ) {
    return this.bloodUnitsService.registerBloodUnit(dto, request.user);
  }

  @RequirePermissions(Permission.REGISTER_BLOOD_UNIT)
  @Post('register/bulk')
  @HttpCode(HttpStatus.CREATED)
  async registerBloodUnitsBulk(
    @Body() dto: BulkRegisterBloodUnitsDto,
    @Req()
    request: Request & {
      user?: {
        id: string;
        role: string;
      };
    },
  ) {
    return this.bloodUnitsService.registerBloodUnitsBulk(dto, request.user);
  }

  @RequirePermissions(Permission.TRANSFER_CUSTODY)
  @Post('transfer-custody')
  @HttpCode(HttpStatus.OK)
  async transferCustody(@Body() dto: TransferCustodyDto) {
    return this.bloodUnitsService.transferCustody(dto);
  }

  @RequirePermissions(Permission.LOG_TEMPERATURE)
  @Post('log-temperature')
  @HttpCode(HttpStatus.OK)
  async logTemperature(@Body() dto: LogTemperatureDto) {
    return this.bloodUnitsService.logTemperature(dto);
  }

  @RequirePermissions(Permission.VIEW_BLOODUNIT_TRAIL)
  @Get(':id/trail')
  async getUnitTrail(@Param('id', ParseIntPipe) id: number) {
    return this.bloodUnitsService.getUnitTrail(id);
  }
}
