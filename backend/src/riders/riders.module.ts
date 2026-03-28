import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReputationEntity } from '../reputation/entities/reputation.entity';
import { ReputationModule } from '../reputation/reputation.module';

import { AssignmentDecisionEntity } from './entities/assignment-decision.entity';
import { AssignmentWeightsEntity } from './entities/assignment-weights.entity';
import { RiderEntity } from './entities/rider.entity';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';
import { AssignmentController } from './controllers/assignment.controller';
import { ReputationAwareAssignmentService } from './services/reputation-aware-assignment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RiderEntity, AssignmentWeightsEntity, AssignmentDecisionEntity, ReputationEntity]),
    ReputationModule,
  ],
  controllers: [RidersController, AssignmentController],
  providers: [RidersService, ReputationAwareAssignmentService],
  exports: [RidersService, ReputationAwareAssignmentService],
})
export class RidersModule {}
