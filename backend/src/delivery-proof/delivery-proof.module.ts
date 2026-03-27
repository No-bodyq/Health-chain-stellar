import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeliveryProofEntity } from './entities/delivery-proof.entity';
import { DeliveryProofService } from './delivery-proof.service';
import { DeliveryProofController } from './delivery-proof.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryProofEntity])],
  controllers: [DeliveryProofController],
  providers: [DeliveryProofService],
  exports: [DeliveryProofService],
})
export class DeliveryProofModule {}
