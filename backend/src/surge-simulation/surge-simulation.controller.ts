import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';

import { SurgeSimulationRequestDto } from './dto/surge-simulation.dto';
import {
  SurgeSimulationResult,
  SurgeSimulationService,
} from './surge-simulation.service';

@ApiTags('operations')
@Public()
@Controller('operations/surge-simulation')
export class SurgeSimulationController {
  constructor(private readonly surgeSimulationService: SurgeSimulationService) {}

  @Post()
  @ApiOperation({
    summary:
      'Simulate a demand surge against current stock and modeled rider capacity',
  })
  @ApiResponse({ status: 200, description: 'Simulation result' })
  async run(
    @Body() dto: SurgeSimulationRequestDto,
  ): Promise<SurgeSimulationResult> {
    return this.surgeSimulationService.simulate(dto);
  }
}
