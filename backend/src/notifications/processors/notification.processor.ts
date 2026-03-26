import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Job } from 'bullmq';
import { Repository } from 'typeorm';

import { NotificationEntity } from '../entities/notification.entity';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { EmailProvider } from '../providers/email.provider';
import { InAppProvider } from '../providers/in-app.provider';
import { PushProvider } from '../providers/push.provider';
import { SmsProvider } from '../providers/sms.provider';

export interface NotificationJobData {
  notificationId: string;
  recipientId: string;
  channel: NotificationChannel;
  renderedBody: string;
  templateKey?: string;
  variables?: any;
}

@Processor('notifications', {
  concurrency: 5,
})
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private notificationRepo: Repository<NotificationEntity>,
    private smsProvider: SmsProvider,
    private pushProvider: PushProvider,
    private emailProvider: EmailProvider,
    private inAppProvider: InAppProvider,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData, any, string>): Promise<any> {
    const { notificationId, channel, recipientId, renderedBody } = job.data;

    const idempotencyKey = `${notificationId}:${channel}`;

    this.logger.log(
      `Processing notification job ${job.id} for ${channel} -> ${recipientId}`,
    );

    const notification = await this.notificationRepo.findOne({
      where: {
        notificationId,
        channel,
      },
    });

    if (!notification) {
      this.logger.warn(`Notification ${notificationId} not found`);
      return;
    }

    if (notification.status === NotificationStatus.SENT) {
      this.logger.warn(
        `Skipping duplicate send for ${idempotencyKey} (already SENT)`,
      );
      return { status: 'already_sent', notificationId };
    }

    try {
      switch (channel) {
        case NotificationChannel.SMS:
          await this.smsProvider.send(recipientId, renderedBody);
          break;
        case NotificationChannel.PUSH:
          // In a real app, recipientId might not be the fcmToken directly.
          // You'd typically resolve the user's FCM token from the DB here.
          // For this example, we'll try to use recipientId as token, or use a variable.
          const fcmToken = job.data.variables?.fcmToken || recipientId;
          const pushTitle = job.data.variables?.pushTitle || 'New Notification';
          await this.pushProvider.send(fcmToken, pushTitle, renderedBody);
          break;
        case NotificationChannel.EMAIL:
          const emailSubject =
            job.data.variables?.emailSubject || 'Notification from Donor Hub';
          await this.emailProvider.send(
            recipientId,
            emailSubject,
            renderedBody,
          );
          break;
        case NotificationChannel.IN_APP:
          const payload = {
            id: notificationId,
            body: renderedBody,
            templateKey: job.data.templateKey,
            createdAt: new Date().toISOString(),
          };
          await this.inAppProvider.send(recipientId, payload);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      // Mark as SENT
      await this.notificationRepo.update(notificationId, {
        status: NotificationStatus.SENT,
        deliveryError: null,
      });

      return { status: 'sent', notificationId };
    } catch (error: any) {
      this.logger.error(
        `Failed to process job ${job.id}: ${error.message}`,
        error.stack,
      );
      throw error; // Will be caught by BullMQ and trigger retry
    }
  }

  // BullMQ hook equivalent. Use this pattern for failed jobs across retries.
  async onFailed(job: Job, error: Error) {
    // If it has reached the max number of attempts, mark it as FAILED in the DB.
    if (job.attemptsMade >= (job.opts.attempts || 1)) {
      this.logger.error(
        `Job ${job.id} definitively failed after ${job.attemptsMade} attempts.`,
      );
      if (job.data?.notificationId) {
        await this.notificationRepo.update(job.data.notificationId, {
          status: NotificationStatus.FAILED,
          deliveryError: error.message || 'Unknown error',
        });
      }
    }
  }
}
