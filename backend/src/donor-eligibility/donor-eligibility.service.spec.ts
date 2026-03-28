import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConflictException } from '@nestjs/common';

import { DonorEligibilityService } from '../donor-eligibility.service';
import { DonorDeferralEntity } from '../entities/donor-deferral.entity';
import { DeferralReason, EligibilityStatus } from '../enums/eligibility.enum';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v) => v),
  save: jest.fn((v) => Promise.resolve({ id: 'def-1', ...v })),
});

describe('DonorEligibilityService', () => {
  let service: DonorEligibilityService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    repo = mockRepo();
    const module = await Test.createTestingModule({
      providers: [
        DonorEligibilityService,
        { provide: getRepositoryToken(DonorDeferralEntity), useValue: repo },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get(DonorEligibilityService);
  });

  it('returns ELIGIBLE when no active deferrals', async () => {
    repo.find.mockResolvedValue([]);
    const result = await service.checkEligibility('donor-1');
    expect(result.status).toBe(EligibilityStatus.ELIGIBLE);
    expect(result.nextEligibleDate).toBeNull();
  });

  it('returns DEFERRED when a future deferral exists', async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    repo.find.mockResolvedValue([
      { id: 'd1', donorId: 'donor-1', reason: DeferralReason.RECENT_DONATION, deferredUntil: future, isActive: true },
    ]);
    const result = await service.checkEligibility('donor-1');
    expect(result.status).toBe(EligibilityStatus.DEFERRED);
    expect(result.nextEligibleDate).toEqual(future);
  });

  it('returns ELIGIBLE when deferral is in the past', async () => {
    const past = new Date(Date.now() - 1000);
    repo.find.mockResolvedValue([
      { id: 'd1', donorId: 'donor-1', reason: DeferralReason.RECENT_DONATION, deferredUntil: past, isActive: true },
    ]);
    const result = await service.checkEligibility('donor-1');
    expect(result.status).toBe(EligibilityStatus.ELIGIBLE);
  });

  it('returns PERMANENTLY_EXCLUDED when a null deferredUntil deferral exists', async () => {
    repo.find.mockResolvedValue([
      { id: 'd1', donorId: 'donor-1', reason: DeferralReason.PERMANENT_EXCLUSION, deferredUntil: null, isActive: true },
    ]);
    const result = await service.checkEligibility('donor-1');
    expect(result.status).toBe(EligibilityStatus.PERMANENTLY_EXCLUDED);
    expect(result.nextEligibleDate).toBeNull();
  });

  it('picks the latest deferral when multiple overlap', async () => {
    const d1 = new Date(Date.now() + 3 * 24 * 3600 * 1000);
    const d2 = new Date(Date.now() + 10 * 24 * 3600 * 1000);
    repo.find.mockResolvedValue([
      { id: 'd1', donorId: 'donor-1', reason: DeferralReason.RECENT_DONATION, deferredUntil: d1, isActive: true },
      { id: 'd2', donorId: 'donor-1', reason: DeferralReason.HEALTH_SCREENING, deferredUntil: d2, isActive: true },
    ]);
    const result = await service.checkEligibility('donor-1');
    expect(result.status).toBe(EligibilityStatus.DEFERRED);
    expect(result.nextEligibleDate).toEqual(d2);
  });

  it('assertEligible throws ConflictException for deferred donor', async () => {
    const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
    repo.find.mockResolvedValue([
      { id: 'd1', donorId: 'donor-1', reason: DeferralReason.RECENT_DONATION, deferredUntil: future, isActive: true },
    ]);
    await expect(service.assertEligible('donor-1')).rejects.toThrow(ConflictException);
  });

  it('computeNextEligibleFromDonation adds 56 days', () => {
    const base = new Date('2026-01-01');
    const next = service.computeNextEligibleFromDonation(base);
    expect(next.getDate()).toBe(new Date('2026-02-26').getDate());
  });

  it('validateAge returns false for under-18', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 17);
    expect(service.validateAge(dob)).toBe(false);
  });

  it('validateAge returns true for 30-year-old', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 30);
    expect(service.validateAge(dob)).toBe(true);
  });
});
