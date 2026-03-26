import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { InventoryLowEvent } from '../events/inventory-low.event';
import { NotificationChannel } from '../notifications/enums/notification-channel.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class InventoryEventListener {
  private readonly logger = new Logger(InventoryEventListener.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  @OnEvent('inventory.low')
  async handleInventoryLow(event: InventoryLowEvent) {
    this.logger.log(
      `Handling low inventory: ${event.bloodType} in ${event.region} - ` +
        `${event.projectedDaysOfSupply.toFixed(1)} days remaining`,
    );

    const adminRecipients = await this.getAdminRecipients(event.region);

    if (adminRecipients.length === 0) {
      this.logger.warn(
        `No admins found for region: ${event.region}. Sending to global admins.`,
      );
      const globalAdmins = await this.getAdminRecipients('Global');
      adminRecipients.push(...globalAdmins);
    }

    for (const adminId of adminRecipients) {
      await this.notificationsService.send({
        recipientId: adminId,
        channels: [NotificationChannel.IN_APP, NotificationChannel.SMS],
        templateKey: 'inventory-low-alert',
        variables: {
          bloodType: event.bloodType,
          region: event.region,
          currentStock: event.currentStock.toString(),
          daysRemaining: event.projectedDaysOfSupply.toFixed(1),
          averageDailyDemand: event.averageDailyDemand.toFixed(1),
          threshold: event.threshold.toString(),
        },
      });
    }
  }

  private async getAdminRecipients(region: string): Promise<string[]> {
    const admins = await this.userRepo.find({
      where: {
        role: 'admin',
        region: region,
      },
      select: ['id'],
    });

    return admins.map((admin) => admin.id);
  }
}
