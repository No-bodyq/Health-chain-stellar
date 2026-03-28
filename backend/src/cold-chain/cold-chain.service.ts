import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';

import { TemperatureSampleEntity } from './entities/temperature-sample.entity';
import { DeliveryComplianceEntity } from './entities/delivery-compliance.entity';
import { IngestTelemetryDto } from './dto/ingest-telemetry.dto';

const SAFE_MIN_C = 2;
const SAFE_MAX_C = 8;

@Injectable()
export class ColdChainService {
  constructor(
    @InjectRepository(TemperatureSampleEntity)
    private readonly sampleRepo: Repository<TemperatureSampleEntity>,
    @InjectRepository(DeliveryComplianceEntity)
    private readonly complianceRepo: Repository<DeliveryComplianceEntity>,
  ) {}

  async ingest(dto: IngestTelemetryDto): Promise<TemperatureSampleEntity> {
    const temp = dto.temperatureCelsius;
    const isExcursion = temp < SAFE_MIN_C || temp > SAFE_MAX_C;

    const sample = this.sampleRepo.create({
      deliveryId: dto.deliveryId,
      orderId: dto.orderId ?? null,
      temperatureCelsius: temp,
      recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
      source: dto.source ?? 'manual',
      isExcursion,
    });

    const saved = await this.sampleRepo.save(sample);
    await this.recalcCompliance(dto.deliveryId, dto.orderId ?? null);
    return saved;
  }

  async getTimeline(deliveryId: string): Promise<TemperatureSampleEntity[]> {
    return this.sampleRepo.find({
      where: { deliveryId },
      order: { recordedAt: 'ASC' },
    });
  }

  async getCompliance(deliveryId: string): Promise<DeliveryComplianceEntity> {
    const c = await this.complianceRepo.findOne({ where: { deliveryId } });
    if (!c) throw new NotFoundException(`No compliance record for delivery '${deliveryId}'`);
    return c;
  }

  private async recalcCompliance(deliveryId: string, orderId: string | null): Promise<void> {
    const samples = await this.sampleRepo.find({ where: { deliveryId } });
    if (!samples.length) return;

    const temps = samples.map((s) => s.temperatureCelsius);
    const excursions = samples.filter((s) => s.isExcursion);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const isCompliant = excursions.length === 0;

    const hash = createHash('sha256')
      .update(`${deliveryId}:${minTemp}:${maxTemp}:${excursions.length}:${isCompliant}`)
      .digest('hex');

    let record = await this.complianceRepo.findOne({ where: { deliveryId } });
    if (!record) {
      record = this.complianceRepo.create({ deliveryId, orderId });
    }

    record.isCompliant = isCompliant;
    record.excursionCount = excursions.length;
    record.minTempCelsius = minTemp;
    record.maxTempCelsius = maxTemp;
    record.complianceHash = hash;
    record.evaluatedAt = new Date();

    await this.complianceRepo.save(record);
  }
}
