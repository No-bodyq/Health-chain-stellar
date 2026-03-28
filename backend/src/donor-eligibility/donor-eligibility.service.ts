import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { DonorDeferralEntity } from './entities/donor-deferral.entity';
import { CreateDeferralDto } from './dto/create-deferral.dto';
import { DeferralReason, EligibilityStatus } from './enums/eligibility.enum';

const MIN_DONATION_INTERVAL_DAYS = 56; // 8 weeks
const MIN_AGE = 18;
const MAX_AGE = 65;

export interface EligibilityResult {
  donorId: string;
  status: EligibilityStatus;
  nextEligibleDate: Date | null;
  activeDeferrals: DonorDeferralEntity[];
}

@Injectable()
export class DonorEligibilityService {
  constructor(
    @InjectRepository(DonorDeferralEntity)
    private readonly deferralRepo: Repository<DonorDeferralEntity>,
    private readonly events: EventEmitter2,
  ) {}

  async checkEligibility(donorId: string): Promise<EligibilityResult> {
    const now = new Date();
    const active = await this.deferralRepo.find({
      where: { donorId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    const permanent = active.find((d) => d.deferredUntil === null);
    if (permanent) {
      return { donorId, status: EligibilityStatus.PERMANENTLY_EXCLUDED, nextEligibleDate: null, activeDeferrals: active };
    }

    const current = active.filter((d) => d.deferredUntil !== null && d.deferredUntil > now);
    if (current.length > 0) {
      const latest = current.reduce((a, b) => (a.deferredUntil! > b.deferredUntil! ? a : b));
      return { donorId, status: EligibilityStatus.DEFERRED, nextEligibleDate: latest.deferredUntil, activeDeferrals: current };
    }

    return { donorId, status: EligibilityStatus.ELIGIBLE, nextEligibleDate: null, activeDeferrals: [] };
  }

  async assertEligible(donorId: string): Promise<void> {
    const result = await this.checkEligibility(donorId);
    if (result.status !== EligibilityStatus.ELIGIBLE) {
      throw new ConflictException(
        `Donor '${donorId}' is not eligible for donation (status: ${result.status}).`,
      );
    }
  }

  async createDeferral(dto: CreateDeferralDto, createdBy?: string): Promise<DonorDeferralEntity> {
    const deferral = this.deferralRepo.create({
      donorId: dto.donorId,
      reason: dto.reason,
      deferredUntil: dto.deferredUntil ? new Date(dto.deferredUntil) : null,
      notes: dto.notes ?? null,
      createdBy: createdBy ?? null,
      isActive: true,
    });
    const saved = await this.deferralRepo.save(deferral);

    this.events.emit('donor.deferred', { donorId: dto.donorId, deferredUntil: saved.deferredUntil });
    return saved;
  }

  async getDeferrals(donorId: string): Promise<DonorDeferralEntity[]> {
    return this.deferralRepo.find({ where: { donorId }, order: { createdAt: 'DESC' } });
  }

  async revokeDeferral(deferralId: string): Promise<DonorDeferralEntity> {
    const d = await this.deferralRepo.findOne({ where: { id: deferralId } });
    if (!d) throw new NotFoundException(`Deferral '${deferralId}' not found`);
    d.isActive = false;
    return this.deferralRepo.save(d);
  }

  /** Compute next eligible date from last donation date */
  computeNextEligibleFromDonation(lastDonationDate: Date): Date {
    const next = new Date(lastDonationDate);
    next.setDate(next.getDate() + MIN_DONATION_INTERVAL_DAYS);
    return next;
  }

  validateAge(dateOfBirth: Date): boolean {
    const age = Math.floor((Date.now() - dateOfBirth.getTime()) / (365.25 * 24 * 3600 * 1000));
    return age >= MIN_AGE && age <= MAX_AGE;
  }
}
