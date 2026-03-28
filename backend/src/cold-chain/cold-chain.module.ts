import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemperatureSampleEntity } from './entities/temperature-sample.entity';
import { DeliveryComplianceEntity } from './entities/delivery-compliance.entity';
import { ColdChainService } from './cold-chain.service';
import { ColdChainController } from './cold-chain.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TemperatureSampleEntity, DeliveryComplianceEntity])],
  controllers: [ColdChainController],
  providers: [ColdChainService],
  exports: [ColdChainService],
})
export class ColdChainModule {}
