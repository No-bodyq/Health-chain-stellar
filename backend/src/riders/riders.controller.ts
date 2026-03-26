import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { CreateRiderDto } from './dto/create-rider.dto';
import { UpdateRiderDto } from './dto/update-rider.dto';
import { RegisterRiderDto } from './dto/register-rider.dto';
import { RiderStatus } from './enums/rider-status.enum';
import { User } from '../auth/decorators/user.decorator';

import { RidersService } from './riders.service';

@Controller('riders')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @RequirePermissions(Permission.VIEW_RIDERS)
  @Get()
  findAll(@Query('status') status?: RiderStatus) {
    return this.ridersService.findAll(status);
  }

  @RequirePermissions(Permission.VIEW_RIDERS)
  @Get('available')
  getAvailable() {
    return this.ridersService.getAvailableRiders();
  }

  @RequirePermissions(Permission.VIEW_RIDERS)
  @Get('nearby')
  getNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius: string = '10',
  ) {
    return this.ridersService.getNearbyRiders(
      parseFloat(latitude),
      parseFloat(longitude),
      parseFloat(radius),
    );
  }

  @RequirePermissions(Permission.VIEW_RIDERS)
  @Get('me')
  getMe(@User('id') userId: string) {
    return this.ridersService.findByUserId(userId);
  }

  @RequirePermissions(Permission.VIEW_RIDERS)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ridersService.findOne(id);
  }

  @Post('register')
  register(@User('id') userId: string, @Body() registerRiderDto: RegisterRiderDto) {
    return this.ridersService.register(userId, registerRiderDto);
  }

  @RequirePermissions(Permission.CREATE_RIDER)
  @Post()
  create(@Body() createRiderDto: CreateRiderDto) {
    return this.ridersService.create(createRiderDto);
  }

  @RequirePermissions(Permission.UPDATE_RIDER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRiderDto: UpdateRiderDto) {
    return this.ridersService.update(id, updateRiderDto);
  }

  @RequirePermissions(Permission.MANAGE_RIDERS)
  @Patch(':id/verify')
  verify(@Param('id') id: string) {
    return this.ridersService.verify(id);
  }

  @RequirePermissions(Permission.UPDATE_RIDER)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: RiderStatus) {
    return this.ridersService.updateStatus(id, status);
  }

  @RequirePermissions(Permission.UPDATE_RIDER)
  @Patch(':id/location')
  updateLocation(
    @Param('id') id: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
  ) {
    return this.ridersService.updateLocation(id, latitude, longitude);
  }

  @RequirePermissions(Permission.DELETE_RIDER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.ridersService.remove(id);
  }
}
