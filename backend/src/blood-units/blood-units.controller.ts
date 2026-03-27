import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseUUIDPipe,
} from '@nestjs/common';

import { Request } from 'express';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

import { BloodStatusService } from './blood-status.service';
import { BloodUnitsService } from './blood-units.service';
import {
  BulkRegisterBloodUnitsDto,
  RegisterBloodUnitDto,
  TransferCustodyDto,
  LogTemperatureDto,
} from './dto/blood-units.dto';
import {
  BulkUpdateBloodStatusDto,
  ReserveBloodUnitDto,
  UpdateBloodStatusDto,
} from './dto/update-blood-status.dto';

@Controller('blood-units')
export class BloodUnitsController {
  constructor(
    private readonly bloodUnitsService: BloodUnitsService,
    private readonly bloodStatusService: BloodStatusService,
  ) {}

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

  @RequirePermissions(Permission.UPDATE_BLOOD_STATUS)
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateBloodStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBloodStatusDto,
    @Req()
    request: Request & { user?: { id: string; role: string } },
  ) {
    return this.bloodStatusService.updateStatus(id, dto, request.user);
  }

  @RequirePermissions(Permission.UPDATE_BLOOD_STATUS)
  @Post(':id/reserve')
  @HttpCode(HttpStatus.OK)
  async reserveBloodUnit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReserveBloodUnitDto,
    @Req()
    request: Request & { user?: { id: string; role: string } },
  ) {
    return this.bloodStatusService.reserveUnit(id, dto, request.user);
  }

  @RequirePermissions(Permission.VIEW_BLOOD_STATUS_HISTORY)
  @Get(':id/status-history')
  async getStatusHistory(@Param('id', ParseUUIDPipe) id: string) {
    return this.bloodStatusService.getStatusHistory(id);
  }

  @RequirePermissions(Permission.UPDATE_BLOOD_STATUS)
  @Post('bulk/status')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateStatus(
    @Body() dto: BulkUpdateBloodStatusDto,
    @Req()
    request: Request & { user?: { id: string; role: string } },
  ) {
    return this.bloodStatusService.bulkUpdateStatus(dto, request.user);
  }
}
