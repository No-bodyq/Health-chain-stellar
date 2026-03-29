import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PolicyVersionEntity } from './entities/policy-version.entity';
import { PolicyCenterController } from './policy-center.controller';
import { PolicyCenterService } from './policy-center.service';

@Module({
  imports: [TypeOrmModule.forFeature([PolicyVersionEntity])],
  controllers: [PolicyCenterController],
  providers: [PolicyCenterService],
  exports: [PolicyCenterService],
})
export class PolicyCenterModule {}
