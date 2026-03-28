import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ColdChainService } from './cold-chain.service';
import { IngestTelemetryDto } from './dto/ingest-telemetry.dto';

@Controller('cold-chain')
export class ColdChainController {
  constructor(private readonly coldChainService: ColdChainService) {}

  @Post('telemetry')
  ingest(@Body() dto: IngestTelemetryDto) {
    return this.coldChainService.ingest(dto);
  }

  @Get('deliveries/:deliveryId/timeline')
  getTimeline(@Param('deliveryId') deliveryId: string) {
    return this.coldChainService.getTimeline(deliveryId);
  }

  @Get('deliveries/:deliveryId/compliance')
  getCompliance(@Param('deliveryId') deliveryId: string) {
    return this.coldChainService.getCompliance(deliveryId);
  }
}
