import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BloodUnitsController } from './blood-units.controller';
import { BloodUnitsService } from './blood-units.service';
import { SorobanModule } from '../soroban/soroban.module';
import { BloodUnitTrail } from '../soroban/entities/blood-unit-trail.entity';
import { BloodUnitEntity } from './entities/blood-unit.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BloodUnitTrail, BloodUnitEntity]),
    SorobanModule,
    NotificationsModule,
  ],
  controllers: [BloodUnitsController],
  providers: [BloodUnitsService],
  exports: [BloodUnitsService],
})
export class BloodUnitsModule {}
