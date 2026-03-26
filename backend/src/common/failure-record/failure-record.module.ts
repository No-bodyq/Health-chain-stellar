import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FailureRecordEntity } from './failure-record.entity';
import { FailureRecordService } from './failure-record.service';

@Module({
  imports: [TypeOrmModule.forFeature([FailureRecordEntity])],
  providers: [FailureRecordService],
  exports: [FailureRecordService],
})
export class FailureRecordModule {}
