import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DisputeEntity } from './entities/dispute.entity';
import { DisputeNoteEntity } from './entities/dispute-note.entity';
import { OpenDisputeDto, ResolveDisputeDto, AddNoteDto } from './dto/dispute.dto';
import { DisputeSeverity, DisputeStatus } from './enums/dispute.enum';

@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(DisputeEntity)
    private readonly disputeRepo: Repository<DisputeEntity>,
    @InjectRepository(DisputeNoteEntity)
    private readonly noteRepo: Repository<DisputeNoteEntity>,
  ) {}

  async open(dto: OpenDisputeDto, openedBy: string): Promise<DisputeEntity> {
    const dispute = this.disputeRepo.create({
      orderId: dto.orderId ?? null,
      paymentId: dto.paymentId ?? null,
      reason: dto.reason,
      severity: dto.severity ?? DisputeSeverity.MEDIUM,
      description: dto.description ?? null,
      openedBy,
      status: DisputeStatus.OPEN,
    });
    return this.disputeRepo.save(dispute);
  }

  async list(filters: { status?: DisputeStatus; severity?: DisputeSeverity; assignedTo?: string }): Promise<DisputeEntity[]> {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    return this.disputeRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async get(id: string): Promise<DisputeEntity> {
    const d = await this.disputeRepo.findOne({ where: { id } });
    if (!d) throw new NotFoundException(`Dispute '${id}' not found`);
    return d;
  }

  async assign(id: string, operatorId: string): Promise<DisputeEntity> {
    const d = await this.get(id);
    d.assignedTo = operatorId;
    d.status = DisputeStatus.UNDER_REVIEW;
    return this.disputeRepo.save(d);
  }

  async resolve(id: string, dto: ResolveDisputeDto): Promise<DisputeEntity> {
    const d = await this.get(id);
    d.resolutionNotes = dto.resolutionNotes;
    d.status = DisputeStatus.RESOLVED;
    d.resolvedAt = new Date();
    return this.disputeRepo.save(d);
  }

  async addNote(id: string, content: string, authorId: string): Promise<DisputeNoteEntity> {
    await this.get(id); // ensure exists
    return this.noteRepo.save(this.noteRepo.create({ disputeId: id, content, authorId }));
  }

  async getNotes(id: string): Promise<DisputeNoteEntity[]> {
    return this.noteRepo.find({ where: { disputeId: id }, order: { createdAt: 'ASC' } });
  }

  async addEvidence(id: string, evidence: { type: string; url: string }): Promise<DisputeEntity> {
    const d = await this.get(id);
    const existing = d.evidence ?? [];
    d.evidence = [...existing, { ...evidence, addedAt: new Date().toISOString() }];
    return this.disputeRepo.save(d);
  }
}
