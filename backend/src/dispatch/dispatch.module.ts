import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { MapsModule } from '../maps/maps.module';
import { PolicyCenterModule } from '../policy-center/policy-center.module';
import { RidersModule } from '../riders/riders.module';

import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { RiderAssignmentService } from './rider-assignment.service';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    RidersModule,
    MapsModule,
    PolicyCenterModule,
  ],
  controllers: [DispatchController],
  providers: [DispatchService, RiderAssignmentService],
  exports: [DispatchService, RiderAssignmentService],
})
export class DispatchModule {}
