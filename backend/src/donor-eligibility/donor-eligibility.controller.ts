import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { User } from '../auth/decorators/user.decorator';
import { DonorEligibilityService } from './donor-eligibility.service';
import { CreateDeferralDto } from './dto/create-deferral.dto';

@Controller('donor-eligibility')
export class DonorEligibilityController {
  constructor(private readonly service: DonorEligibilityService) {}

  @Get(':donorId')
  checkEligibility(@Param('donorId') donorId: string) {
    return this.service.checkEligibility(donorId);
  }

  @Get(':donorId/deferrals')
  getDeferrals(@Param('donorId') donorId: string) {
    return this.service.getDeferrals(donorId);
  }

  @Post('deferrals')
  createDeferral(@Body() dto: CreateDeferralDto, @User('id') userId: string) {
    return this.service.createDeferral(dto, userId);
  }

  @Delete('deferrals/:id')
  revokeDeferral(@Param('id') id: string) {
    return this.service.revokeDeferral(id);
  }
}
