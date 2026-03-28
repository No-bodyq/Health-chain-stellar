import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PaginatedResponse, PaginationUtil } from '../common/pagination';
import { CreateDeliveryProofDto } from './dto/create-delivery-proof.dto';
import { DeliveryProofQueryDto } from './dto/delivery-proof-query.dto';
import { DeliveryProofEntity } from './entities/delivery-proof.entity';

// Blood products must be stored between 2°C and 6°C (backend compliance threshold)
const TEMP_MIN_CELSIUS = 2;
const TEMP_MAX_CELSIUS = 6;

export interface DeliveryStatistics {
  totalDeliveries: number;
  successfulDeliveries: number;
  successRate: number;
  temperatureCompliantDeliveries: number;
  temperatureComplianceRate: number;
  averageTemperatureCelsius: number | null;
}

@Injectable()
export class DeliveryProofService {
  constructor(
    @InjectRepository(DeliveryProofEntity)
    private readonly proofRepo: Repository<DeliveryProofEntity>,
  ) {}

  async create(dto: CreateDeliveryProofDto): Promise<DeliveryProofEntity> {
    const pickupTimestamp = new Date(dto.pickupTimestamp);
    const deliveredAt = new Date(dto.deliveredAt);

    if (deliveredAt < pickupTimestamp) {
      throw new BadRequestException(
        'deliveredAt must be after pickupTimestamp',
      );
    }
    if (!dto.temperatureReadings || dto.temperatureReadings.length === 0) {
      throw new BadRequestException(
        'At least one temperature reading is required',
      );
    }

    const isTemperatureCompliant = dto.temperatureReadings.every(
      (t) => t >= TEMP_MIN_CELSIUS && t <= TEMP_MAX_CELSIUS,
    );

    const proof = this.proofRepo.create({
      orderId: dto.orderId,
      requestId: dto.requestId ?? null,
      riderId: dto.riderId,
      pickupTimestamp,
      pickupLocationHash: dto.pickupLocationHash ?? null,
      deliveredAt,
      deliveryLocationHash: dto.deliveryLocationHash ?? null,
      recipientName: dto.recipientName,
      recipientSignatureUrl: dto.recipientSignatureUrl ?? null,
      recipientSignatureHash: dto.recipientSignatureHash ?? null,
      photoUrl: dto.photoUrl ?? null,
      photoHashes: dto.photoHashes ?? [],
      temperatureReadings: dto.temperatureReadings,
      temperatureCelsius: dto.temperatureCelsius ?? null,
      notes: dto.notes ?? null,
      isTemperatureCompliant,
      verified: false,
    });

    return this.proofRepo.save(proof);
  }

  async getDeliveryProof(id: string): Promise<DeliveryProofEntity> {
    const proof = await this.proofRepo.findOne({ where: { id } });
    if (!proof) throw new NotFoundException(`Delivery proof '${id}' not found`);
    return proof;
  }

  async getProofsByRider(
    riderId: string,
    query: DeliveryProofQueryDto,
  ): Promise<PaginatedResponse<DeliveryProofEntity>> {
    return this.queryProofs({ ...query, riderId });
  }

  async getProofsByRequest(
    requestId: string,
    query: DeliveryProofQueryDto,
  ): Promise<PaginatedResponse<DeliveryProofEntity>> {
    return this.queryProofs({ ...query, requestId });
  }

  async queryProofs(
    query: DeliveryProofQueryDto,
  ): Promise<PaginatedResponse<DeliveryProofEntity>> {
    const { page = 1, pageSize = 25 } = query;
    const qb = this.proofRepo.createQueryBuilder('proof');

    if (query.riderId) {
      qb.andWhere('proof.riderId = :riderId', { riderId: query.riderId });
    }
    if (query.requestId) {
      qb.andWhere('proof.requestId = :requestId', { requestId: query.requestId });
    }
    if (query.startDate) {
      qb.andWhere('proof.deliveredAt >= :startDate', { startDate: query.startDate });
    }
    if (query.endDate) {
      qb.andWhere('proof.deliveredAt <= :endDate', { endDate: query.endDate });
    }
    if (query.temperatureCompliantOnly) {
      qb.andWhere('proof.isTemperatureCompliant = true');
    }

    qb.orderBy('proof.deliveredAt', 'DESC');
    qb.skip(PaginationUtil.calculateSkip(page, pageSize));
    qb.take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return PaginationUtil.createResponse(data, page, pageSize, total);
  }

  isTemperatureCompliant(temperatureCelsius: number): boolean {
    return (
      temperatureCelsius >= TEMP_MIN_CELSIUS &&
      temperatureCelsius <= TEMP_MAX_CELSIUS
    );
  }

  async getDeliveryStatistics(
    riderId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<DeliveryStatistics> {
    const qb = this.proofRepo.createQueryBuilder('proof');

    if (riderId) qb.andWhere('proof.riderId = :riderId', { riderId });
    if (startDate) qb.andWhere('proof.deliveredAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('proof.deliveredAt <= :endDate', { endDate });

    const proofs = await qb.getMany();

    const totalDeliveries = proofs.length;
    const successfulDeliveries = proofs.length;
    const successRate = this.calculateSuccessRate(successfulDeliveries, totalDeliveries);

    const compliant = proofs.filter((p) => p.isTemperatureCompliant);
    const temperatureComplianceRate = this.calculateSuccessRate(
      compliant.length,
      totalDeliveries,
    );

    const withTemp = proofs.filter((p) => p.temperatureCelsius !== null);
    const averageTemperatureCelsius =
      withTemp.length > 0
        ? withTemp.reduce((sum, p) => sum + p.temperatureCelsius!, 0) / withTemp.length
        : null;

    return {
      totalDeliveries,
      successfulDeliveries,
      successRate,
      temperatureCompliantDeliveries: compliant.length,
      temperatureComplianceRate,
      averageTemperatureCelsius:
        averageTemperatureCelsius !== null
          ? Math.round(averageTemperatureCelsius * 100) / 100
          : null,
    };
  }

  calculateSuccessRate(successful: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((successful / total) * 10000) / 100;
  }
}
