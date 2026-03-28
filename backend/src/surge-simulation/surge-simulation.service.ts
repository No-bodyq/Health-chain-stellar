import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { InventoryStockEntity } from '../inventory/entities/inventory-stock.entity';
import { RiderEntity } from '../riders/entities/rider.entity';
import { RiderStatus } from '../riders/enums/rider-status.enum';

import { SurgeSimulationRequestDto } from './dto/surge-simulation.dto';

export interface SurgeSimulationResult {
  surgeDemandUnits: number;
  baselineStockUnits: number;
  riderCapacityUnits: number;
  unitsPerRiderAssumption: number;
  activeRidersConsidered: number;
  stockGapUnits: number;
  riderGapUnits: number;
  canAbsorbWithStock: boolean;
  canAbsorbWithRiders: boolean;
  summary: string;
}

@Injectable()
export class SurgeSimulationService {
  constructor(
    @InjectRepository(InventoryStockEntity)
    private readonly inventoryRepo: Repository<InventoryStockEntity>,
    @InjectRepository(RiderEntity)
    private readonly riderRepo: Repository<RiderEntity>,
  ) {}

  async simulate(dto: SurgeSimulationRequestDto): Promise<SurgeSimulationResult> {
    const unitsPerRider = dto.unitsPerRider ?? 4;

    let baselineStockUnits = dto.overrideStockUnits;
    if (baselineStockUnits === undefined) {
      const rows = await this.inventoryRepo.find();
      baselineStockUnits = rows.reduce(
        (sum, r) => sum + (Number(r.availableUnits) || 0),
        0,
      );
    }

    let riderCapacityUnits = dto.overrideRiderCapacityUnits;
    let activeRidersConsidered = 0;
    if (riderCapacityUnits === undefined) {
      const activeStatuses = [
        RiderStatus.AVAILABLE,
        RiderStatus.ON_DELIVERY,
        RiderStatus.BUSY,
      ];
      activeRidersConsidered = await this.riderRepo
        .createQueryBuilder('r')
        .where('r.status IN (:...statuses)', { statuses: activeStatuses })
        .getCount();

      riderCapacityUnits = Math.floor(activeRidersConsidered * unitsPerRider);
    } else {
      activeRidersConsidered = Math.ceil(riderCapacityUnits / unitsPerRider);
    }

    const stockGapUnits = Math.max(0, dto.surgeDemandUnits - baselineStockUnits);
    const riderGapUnits = Math.max(
      0,
      dto.surgeDemandUnits - riderCapacityUnits,
    );

    const canAbsorbWithStock = baselineStockUnits >= dto.surgeDemandUnits;
    const canAbsorbWithRiders = riderCapacityUnits >= dto.surgeDemandUnits;

    const summary = [
      canAbsorbWithStock
        ? 'Reported stock can cover the surge.'
        : `Stock short by approximately ${stockGapUnits} units.`,
      canAbsorbWithRiders
        ? 'Modeled rider capacity can cover concurrent delivery needs.'
        : `Rider capacity short by approximately ${riderGapUnits} units (at ${unitsPerRider} units / rider).`,
    ].join(' ');

    return {
      surgeDemandUnits: dto.surgeDemandUnits,
      baselineStockUnits,
      riderCapacityUnits,
      unitsPerRiderAssumption: unitsPerRider,
      activeRidersConsidered,
      stockGapUnits,
      riderGapUnits,
      canAbsorbWithStock,
      canAbsorbWithRiders,
      summary,
    };
  }
}
