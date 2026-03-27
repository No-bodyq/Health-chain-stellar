import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReputationService } from './reputation.service';
import { ReputationController } from './reputation.controller';
import { ReputationEntity } from './entities/reputation.entity';
import { ReputationHistoryEntity } from './entities/reputation-history.entity';
import { RiderEntity } from '../riders/entities/rider.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReputationEntity, ReputationHistoryEntity, RiderEntity])],
  controllers: [ReputationController],
  providers: [ReputationService],
  exports: [ReputationService],
})
export class ReputationModule {}
