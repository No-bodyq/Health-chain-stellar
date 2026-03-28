import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CreateDeliveryProofDto } from './dto/create-delivery-proof.dto';
import { DeliveryProofQueryDto } from './dto/delivery-proof-query.dto';
import { DeliveryProofService } from './delivery-proof.service';

@Controller('delivery-proofs')
export class DeliveryProofController {
  constructor(private readonly service: DeliveryProofService) {}

  @Post()
  create(@Body() dto: CreateDeliveryProofDto) {
    return this.service.create(dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getDeliveryProof(id);
  }

  @Get()
  query(@Query() query: DeliveryProofQueryDto) {
    return this.service.queryProofs(query);
  }

  @Get('rider/:riderId')
  byRider(
    @Param('riderId') riderId: string,
    @Query() query: DeliveryProofQueryDto,
  ) {
    return this.service.getProofsByRider(riderId, query);
  }

  @Get('request/:requestId')
  byRequest(
    @Param('requestId') requestId: string,
    @Query() query: DeliveryProofQueryDto,
  ) {
    return this.service.getProofsByRequest(requestId, query);
  }

  @Get('rider/:riderId/statistics')
  statistics(
    @Param('riderId') riderId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.service.getDeliveryStatistics(riderId, startDate, endDate);
  }
}
