import { randomBytes } from 'crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { UserRole } from '../auth/enums/user-role.enum';
import { SorobanService } from '../blockchain/services/soroban.service';
import { CompensationService } from '../common/compensation/compensation.service';
import {
  BloodRequestIrrecoverableError,
  CompensationAction,
} from '../common/errors/app-errors';
import { InventoryService } from '../inventory/inventory.service';
import { EmailProvider } from '../notifications/providers/email.provider';

import { CreateBloodRequestDto } from './dto/create-blood-request.dto';
import { BloodRequestItemEntity } from './entities/blood-request-item.entity';
import { BloodRequestEntity } from './entities/blood-request.entity';
import { BloodRequestStatus } from './enums/blood-request-status.enum';

type RequestUser = { id: string; role: string; email: string };

@Injectable()
export class BloodRequestsService {
  private readonly logger = new Logger(BloodRequestsService.name);

  constructor(
    @InjectRepository(BloodRequestEntity)
    private readonly bloodRequestRepo: Repository<BloodRequestEntity>,
    @InjectRepository(BloodRequestItemEntity)
    private readonly bloodRequestItemRepo: Repository<BloodRequestItemEntity>,
    private readonly inventoryService: InventoryService,
    private readonly sorobanService: SorobanService,
    private readonly emailProvider: EmailProvider,
    private readonly compensationService: CompensationService,
  ) {}

  private assertHospitalAuthorization(
    user: RequestUser,
    hospitalId: string,
  ): void {
    if (user.role === UserRole.HOSPITAL && user.id !== hospitalId) {
      throw new ForbiddenException(
        'Hospital accounts may only create blood requests where hospitalId matches their user id.',
      );
    }
  }

  private assertRequiredByFuture(requiredByIso: string): Date {
    const requiredBy = new Date(requiredByIso);
    if (Number.isNaN(requiredBy.getTime())) {
      throw new BadRequestException(
        'requiredBy must be a valid ISO 8601 date-time',
      );
    }
    if (requiredBy.getTime() <= Date.now()) {
      throw new BadRequestException('requiredBy must be in the future');
    }
    return requiredBy;
  }

  private async allocateRequestNumber(): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const suffix = randomBytes(3).toString('hex').toUpperCase();
      const requestNumber = `BR-${Date.now()}-${suffix}`;
      const exists = await this.bloodRequestRepo.exist({
        where: { requestNumber },
      });
      if (!exists) {
        return requestNumber;
      }
    }
    throw new Error('Unable to allocate a unique request number');
  }

  private async releaseReservations(
    reserved: Array<{
      bloodBankId: string;
      bloodType: string;
      quantity: number;
    }>,
  ): Promise<void> {
    for (const r of reserved.reverse()) {
      await this.inventoryService.releaseStockByBankAndType(
        r.bloodBankId,
        r.bloodType,
        r.quantity,
      );
    }
  }

  async create(
    dto: CreateBloodRequestDto,
    user: RequestUser,
  ): Promise<{ message: string; data: BloodRequestEntity }> {
    this.assertHospitalAuthorization(user, dto.hospitalId);
    const requiredBy = this.assertRequiredByFuture(dto.requiredBy);

    const requestNumber = await this.allocateRequestNumber();

    const reserved: Array<{
      bloodBankId: string;
      bloodType: string;
      quantity: number;
    }> = [];

    try {
      for (const item of dto.items) {
        const bloodType = item.bloodType.trim();
        await this.inventoryService.reserveStockOrThrow(
          item.bloodBankId,
          bloodType,
          item.quantity,
        );
        reserved.push({
          bloodBankId: item.bloodBankId,
          bloodType,
          quantity: item.quantity,
        });
      }

      const chainPayload = dto.items.map((i) => ({
        bloodBankId: i.bloodBankId,
        bloodType: i.bloodType.trim(),
        quantity: i.quantity,
      }));

      let transactionHash: string;
      try {
        const chainResult = await this.sorobanService.submitTransactionAndWait({
          contractMethod: 'create_blood_request',
          args: [requestNumber, dto.hospitalId, JSON.stringify(chainPayload)],
          idempotencyKey: `blood-request:${requestNumber}`,
          metadata: { requestNumber, hospitalId: dto.hospitalId },
        });
        transactionHash = chainResult.transactionHash;
      } catch (err) {
        // Blockchain failure is irrecoverable — inventory must be rolled back
        const irrecoverableErr = new BloodRequestIrrecoverableError(
          `Soroban create_blood_request failed for ${requestNumber}`,
          {
            requestNumber,
            hospitalId: dto.hospitalId,
            reservedItems: reserved,
          },
          err,
        );

        const releaseHandlers = reserved.map((r) => ({
          action: CompensationAction.REVERT_INVENTORY,
          execute: async () => {
            await this.inventoryService.releaseStockByBankAndType(
              r.bloodBankId,
              r.bloodType,
              r.quantity,
            );
            return true;
          },
        }));

        const notifyHandler = {
          action: CompensationAction.NOTIFY_USER,
          execute: async () => {
            try {
              await this.emailProvider.send(
                user.email,
                `Blood request ${requestNumber} could not be processed`,
                `<p>Your blood request <strong>${requestNumber}</strong> could not be registered on-chain and has been cancelled. Inventory reservations have been released. Please try again or contact support.</p>`,
              );
              return true;
            } catch {
              return false;
            }
          },
        };

        const adminAlertHandler = {
          action: CompensationAction.NOTIFY_ADMIN,
          execute: async () => {
            this.logger.error(`[ADMIN ALERT] Blood request on-chain failure`, {
              requestNumber,
              hospitalId: dto.hospitalId,
            });
            return true;
          },
        };

        const flagHandler = {
          action: CompensationAction.FLAG_FOR_REVIEW,
          execute: async () => true,
        };

        const result = await this.compensationService.compensate(
          irrecoverableErr,
          [...releaseHandlers, notifyHandler, adminAlertHandler, flagHandler],
          `blood-request:${requestNumber}`,
        );

        // Attach the failure record ID so the HTTP filter can surface it
        irrecoverableErr.context['failureRecordId'] = result.failureRecordId;
        throw irrecoverableErr;
      }

      const parent = this.bloodRequestRepo.create({
        requestNumber,
        hospitalId: dto.hospitalId,
        requiredBy,
        deliveryAddress: dto.deliveryAddress?.trim() ?? null,
        notes: dto.notes?.trim() ?? null,
        status: BloodRequestStatus.PENDING,
        blockchainTxHash: transactionHash,
        createdByUserId: user.id,
        items: dto.items.map((i) =>
          this.bloodRequestItemRepo.create({
            bloodBankId: i.bloodBankId,
            bloodType: i.bloodType.trim(),
            quantity: i.quantity,
          }),
        ),
      });

      const saved = await this.bloodRequestRepo.save(parent);

      await this.sendCreationEmail(user.email, saved);

      return {
        message: 'Blood request created successfully',
        data: saved,
      };
    } catch (err) {
      // Only release reservations if the irrecoverable handler hasn't already done so.
      // BloodRequestIrrecoverableError carries REVERT_INVENTORY in its compensations,
      // meaning the CompensationService already released stock above.
      if (!(err instanceof BloodRequestIrrecoverableError)) {
        await this.releaseReservations(reserved);
      }
      throw err;
    }
  }

  private async sendCreationEmail(
    to: string,
    request: BloodRequestEntity,
  ): Promise<void> {
    const lines = request.items
      .map(
        (i) =>
          `<li>${i.bloodType} × ${i.quantity} (bank <code>${i.bloodBankId}</code>)</li>`,
      )
      .join('');
    const html = `
      <p>Blood request <strong>${request.requestNumber}</strong> was created.</p>
      <p>Required by: ${request.requiredBy.toISOString()}</p>
      <ul>${lines}</ul>
      <p>On-chain tx: <code>${request.blockchainTxHash ?? 'n/a'}</code></p>
    `;
    await this.emailProvider.send(
      to,
      `Blood request ${request.requestNumber} confirmed`,
      html,
    );
  }
}
