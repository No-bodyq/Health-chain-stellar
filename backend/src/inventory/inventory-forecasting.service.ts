import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { Queue } from 'bullmq';
import { Repository, MoreThanOrEqual } from 'typeorm';

import { InventoryLowEvent } from '../events/inventory-low.event';
import { OrderEntity } from '../orders/entities/order.entity';

import { InventoryEntity } from './entities/inventory.entity';
import {
  DemandForecast,
  ForecastThreshold,
} from './interfaces/forecast.interface';

@Injectable()
export class InventoryForecastingService {
  private readonly logger = new Logger(InventoryForecastingService.name);
  private readonly defaultThreshold: number;
  private readonly historyDays: number;
  private thresholds: Map<string, number> = new Map();

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepo: Repository<OrderEntity>,
    @InjectRepository(InventoryEntity)
    private readonly inventoryRepo: Repository<InventoryEntity>,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    @InjectQueue('donor-outreach') private readonly outreachQueue: Queue,
  ) {
    this.defaultThreshold = Number(
      this.configService.get<number>('INVENTORY_FORECAST_THRESHOLD_DAYS', 3),
    );
    this.historyDays = Number(
      this.configService.get<number>('INVENTORY_FORECAST_HISTORY_DAYS', 30),
    );
    this.loadThresholds();
  }

  private loadThresholds() {
    const thresholdsConfig = this.configService.get<string>(
      'INVENTORY_FORECAST_THRESHOLDS',
    );
    if (thresholdsConfig) {
      try {
        const parsed: ForecastThreshold[] =
          typeof thresholdsConfig === 'string'
            ? JSON.parse(thresholdsConfig)
            : thresholdsConfig;
        parsed.forEach((t) => {
          this.thresholds.set(`${t.bloodType}:${t.region}`, t.daysThreshold);
        });
      } catch (err) {
        this.logger.warn(
          'Failed to parse INVENTORY_FORECAST_THRESHOLDS, using defaults',
        );
      }
    }
  }

  private getThreshold(bloodType: string, region: string): number {
    return (
      this.thresholds.get(`${bloodType}:${region}`) || this.defaultThreshold
    );
  }

  @Cron(process.env.INVENTORY_FORECAST_CRON || CronExpression.EVERY_6_HOURS)
  async runForecast() {
    this.logger.log('Running inventory forecast');

    try {
      const forecasts = await this.calculateDemandForecasts();

      for (const forecast of forecasts) {
        const threshold = this.getThreshold(
          forecast.bloodType,
          forecast.region,
        );

        if (forecast.projectedDaysOfSupply < threshold) {
          this.logger.warn(
            `Low inventory alert: ${forecast.bloodType} in ${forecast.region} - ` +
              `${forecast.projectedDaysOfSupply.toFixed(1)} days remaining (threshold: ${threshold})`,
          );

          await this.handleLowInventory(forecast, threshold);
        }
      }

      this.logger.log(
        `Forecast complete. Processed ${forecasts.length} blood type/region combinations`,
      );
    } catch (error) {
      this.logger.error('Forecast failed', error);
    }
  }

  async calculateDemandForecasts(): Promise<DemandForecast[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.historyDays);

    const orders = await this.orderRepo.find({
      where: {
        createdAt: MoreThanOrEqual(cutoffDate),
      },
      select: ['bloodType', 'quantity', 'deliveryAddress', 'createdAt'],
    });

    const demandMap = new Map<
      string,
      { totalQuantity: number; count: number; currentStock: number }
    >();

    orders.forEach((order) => {
      const region = this.extractRegion(order.deliveryAddress);
      const key = `${order.bloodType}:${region}`;

      const existing = demandMap.get(key) || {
        totalQuantity: 0,
        count: 0,
        currentStock: 0,
      };
      existing.totalQuantity += order.quantity;
      existing.count += 1;
      demandMap.set(key, existing);
    });

    const forecasts: DemandForecast[] = [];

    for (const [key, data] of demandMap.entries()) {
      const [bloodType, region] = key.split(':');
      const averageDailyDemand = data.totalQuantity / this.historyDays;
      const currentStock = await this.getCurrentStock(bloodType, region);

      const projectedDaysOfSupply =
        averageDailyDemand > 0 ? currentStock / averageDailyDemand : Infinity;

      forecasts.push({
        bloodType,
        region,
        currentStock,
        averageDailyDemand,
        projectedDaysOfSupply,
      });
    }

    return forecasts;
  }

  private async handleLowInventory(
    forecast: DemandForecast,
    threshold: number,
  ) {
    const event = new InventoryLowEvent(
      forecast.bloodType,
      forecast.region,
      forecast.currentStock,
      forecast.projectedDaysOfSupply,
      forecast.averageDailyDemand,
      threshold,
    );

    this.eventEmitter.emit('inventory.low', event);

    await this.outreachQueue.add('recommend-donor-outreach', {
      bloodType: forecast.bloodType,
      region: forecast.region,
      urgency: forecast.projectedDaysOfSupply < 1 ? 'critical' : 'high',
      projectedDaysOfSupply: forecast.projectedDaysOfSupply,
      requiredUnits: Math.ceil(
        forecast.averageDailyDemand * threshold - forecast.currentStock,
      ),
    });
  }

  private extractRegion(address: string): string {
    const parts = address.split(',').map((p) => p.trim());
    return parts[parts.length - 1] || 'Unknown';
  }

  private async getCurrentStock(
    bloodType: string,
    region: string,
  ): Promise<number> {
    const inventory = await this.inventoryRepo.findOne({
      where: { bloodType, region },
    });
    return inventory?.quantity || 0;
  }
}
