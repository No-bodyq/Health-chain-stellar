import { Module } from '@nestjs/common';

import { FailureRecordModule } from '../failure-record/failure-record.module';

import { CompensationService } from './compensation.service';

@Module({
  imports: [FailureRecordModule],
  providers: [CompensationService],
  exports: [CompensationService],
})
export class CompensationModule {}
