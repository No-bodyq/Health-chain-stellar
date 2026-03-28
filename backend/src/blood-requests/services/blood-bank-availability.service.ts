import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MapsService } from '../../maps/maps.service';
import { InventoryStockEntity } from '../../inventory/entities/inventory-stock.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { BloodComponent } from '../../blood-units/enums/blood-component.enum';
import { BloodType } from '../../blood-units/enums/blood-type.enum';
import {
  BloodBankAvailabilityDto,
  GetAvailabilityResponseDto,
} from '../dto/get-availability.dto';

@Injectable()
export class BloodBankAvailabilityService {
  private readonly logger = new Logger(BloodBankAvailabilityService.name);
  private readonly CONFIDENCE_SCALE = 100;

  constructor(
    @InjectRepository(InventoryStockEntity)
    private readonly inventoryRepo: Repository<InventoryStockEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepo: Repository<OrganizationEntity>,
    private readonly mapsService: MapsService,
  ) {}

  /**
   * Find nearby blood banks with requested blood type/component
   * Rank by availability, ETA, and reliability factors
   */
  async findNearbyBanksWithStock(
    bloodType: BloodType,
    component: BloodComponent,
    originLatitude?: number,
    originLongitude?: number,
    originAddress?: string,
    maxDistanceKm: number = 100,
    maxResults: number = 10,
  ): Promise<GetAvailabilityResponseDto> {
    const requestId = this.generateRequestId();
    const timestamp = new Date().toISOString();

    // Find all blood banks with requested stock
    const stockRecords = await this.inventoryRepo.find({
      where: {
        bloodType,
        component,
      },
    });

    if (stockRecords.length === 0) {
      return {
        success: true,
        requestId,
        timestamp,
        query: {
          bloodType,
          component,
          latitude: originLatitude,
          longitude: originLongitude,
        },
        results: [],
        summary: {
          totalBanksFound: 0,
          topChoiceEta: null,
          topChoiceConfidence: null,
        },
      };
    }

    // Get blood bank details
    const bloodBankIds = [...new Set(stockRecords.map((s) => s.bloodBankId))];
    const bloodBanks = await this.organizationRepo.findByIds(bloodBankIds);

    // Build availability data with rankings
    const availabilityData: BloodBankAvailabilityDto[] = [];

    for (const stock of stockRecords) {
      const bank = bloodBanks.find((b) => b.id === stock.bloodBankId);
      if (!bank || !bank.latitude || !bank.longitude) {
        continue;
      }

      let estDeliveryTimeMinutes = this.estimateDeliveryTime(
        originLatitude,
        originLongitude,
        bank.latitude as unknown as number,
        bank.longitude as unknown as number,
      );

      // Try to get actual ETA from maps service if we have an address
      if (originAddress && bank.address) {
        try {
          const travelTimeSeconds = await this.mapsService.getTravelTimeSeconds(
            originAddress,
            bank.address,
          );
          estDeliveryTimeMinutes = Math.round(travelTimeSeconds / 60);
        } catch (error) {
          this.logger.warn(
            `Failed to get travel time from "${originAddress}" to "${bank.address}": ${error}`,
          );
          // Fall back to estimated time
        }
      }

      const confidenceScore = this.calculateConfidenceScore(
        stock.availableUnitsMl,
        stock.reservedUnitsMl,
        estDeliveryTimeMinutes,
      );

      availabilityData.push({
        bloodBankId: bank.id,
        bloodBankName: bank.name,
        address: bank.address || `${bank.city}, ${bank.country}`,
        latitude: bank.latitude as unknown as number,
        longitude: bank.longitude as unknown as number,
        bloodType,
        component,
        availableQuantityMl: stock.availableUnitsMl,
        reservedQuantityMl: stock.reservedUnitsMl,
        estDeliveryTimeMinutes,
        confidenceScore,
        stockFreshness: this.calculateStockFreshness(stock.updatedAt),
        reservationRisk: this.calculateReservationRisk(
          stock.availableUnitsMl,
          stock.reservedUnitsMl,
        ),
        dispatchLoad: this.estimateDispatchLoad(stock.bloodBankId), // TODO: integrate with dispatch service
        compatibilitySummary: `${stock.bloodType} ${stock.component}`,
      });
    }

    // Sort by confidence score (descending)
    availabilityData.sort((a, b) => b.confidenceScore - a.confidenceScore);

    // Filter by max results
    const topResults = availabilityData.slice(0, maxResults);

    return {
      success: true,
      requestId,
      timestamp,
      query: {
        bloodType,
        component,
        latitude: originLatitude,
        longitude: originLongitude,
      },
      results: topResults,
      summary: {
        totalBanksFound: availabilityData.length,
        topChoiceEta: topResults.length > 0 ? topResults[0].estDeliveryTimeMinutes : null,
        topChoiceConfidence: topResults.length > 0 ? topResults[0].confidenceScore : null,
      },
    };
  }

  /**
   * Estimate delivery time based on lat/long coordinates
   * Using simple haversine distance approximation
   */
  private estimateDeliveryTime(
    originLat?: number,
    originLng?: number,
    bankLat?: number,
    bankLng?: number,
  ): number {
    if (!originLat || !originLng || !bankLat || !bankLng) {
      return 60; // Default 1 hour if coordinates missing
    }

    const distanceKm = this.calculateHaversineDistance(
      originLat,
      originLng,
      bankLat,
      bankLng,
    );

    // Assume average delivery speed of 40 km/h accounting for logistics
    const deliveryMinutes = Math.round((distanceKm / 40) * 60);
    return Math.max(15, deliveryMinutes); // Minimum 15 minutes
  }

  /**
   * Haversine formula for great-circle distance between two points
   */
  private calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Calculate confidence score (0-100) based on:
   * - Available inventory quantity (higher available = higher confidence)
   * - Reservation risk (high reservations = lower confidence)
   * - Delivery time (shorter delivery = higher confidence)
   */
  private calculateConfidenceScore(
    availableQuantityMl: number,
    reservedQuantityMl: number,
    estDeliveryTimeMinutes: number,
  ): number {
    const MIN_AVAILABLE = 100; // Minimum acceptable
    const MAX_AVAILABLE = 1000; // Saturated stock

    // Stock component: 0-40 points
    const availableScore = Math.min(
      40,
      (availableQuantityMl / MAX_AVAILABLE) * 40,
    );

    // Reservation risk component: 0-30 points
    const totalQuantity = availableQuantityMl + reservedQuantityMl;
    const reservationRatio = totalQuantity > 0 ? reservedQuantityMl / totalQuantity : 0;
    const reservationScore = Math.max(
      0,
      30 - reservationRatio * 30,
    );

    // Delivery time component: 0-30 points
    const MAX_DELIVERY_TIME = 240; // 4 hours
    const deliveryScore = Math.max(
      0,
      30 - (estDeliveryTimeMinutes / MAX_DELIVERY_TIME) * 30,
    );

    return Math.round(availableScore + reservationScore + deliveryScore);
  }

  /**
   * Calculate stock freshness (0-100) based on last update
   */
  private calculateStockFreshness(lastUpdated: Date): number {
    const nowMs = Date.now();
    const updatedMs = lastUpdated.getTime();
    const ageMinutes = (nowMs - updatedMs) / (1000 * 60);

    const MAX_FRESH_AGE_MINUTES = 60;
    if (ageMinutes <= MAX_FRESH_AGE_MINUTES) {
      return 100;
    }

    const MAX_STALE_AGE_MINUTES = 1440; // 24 hours
    if (ageMinutes >= MAX_STALE_AGE_MINUTES) {
      return 10;
    }

    // Linear decline from 100 to 10
    const freshness = 100 - ((ageMinutes - MAX_FRESH_AGE_MINUTES) / (MAX_STALE_AGE_MINUTES - MAX_FRESH_AGE_MINUTES)) * 90;
    return Math.round(freshness);
  }

  /**
   * Calculate reservation risk (0-100) based on reserved vs available ratio
   */
  private calculateReservationRisk(
    availableQuantityMl: number,
    reservedQuantityMl: number,
  ): number {
    const totalQuantity = availableQuantityMl + reservedQuantityMl;
    if (totalQuantity === 0) {
      return 0;
    }

    const reservationRatio = reservedQuantityMl / totalQuantity;
    return Math.round(reservationRatio * 100);
  }

  /**
   * Estimate dispatch load for a blood bank
   * TODO: This should integrate with dispatch service to get actual load
   */
  private estimateDispatchLoad(bloodBankId: string): number {
    // Placeholder: return random value
    // In production, query dispatch service for active orders
    return Math.round(Math.random() * 50);
  }

  /**
   * Generate unique request ID for correlation
   */
  private generateRequestId(): string {
    return `avail-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
