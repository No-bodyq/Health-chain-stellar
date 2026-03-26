import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { NotificationEntity } from '../entities/notification.entity';
import { NotificationChannel } from '../enums/notification-channel.enum';
import { NotificationStatus } from '../enums/notification-status.enum';
import { EmailProvider } from '../providers/email.provider';
import { InAppProvider } from '../providers/in-app.provider';
import { PushProvider } from '../providers/push.provider';
import { SmsProvider } from '../providers/sms.provider';

import { NotificationProcessor } from './notification.processor';

describe('Duplicate Notification Retry Protection', () => {
  let processor: NotificationProcessor;
  let repo: Repository<NotificationEntity>;
  let smsProvider: SmsProvider;

  const notificationId = 'order-123';

  const mockNotification: Partial<NotificationEntity> = {
    id: notificationId,
    status: NotificationStatus.PENDING,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        {
          provide: getRepositoryToken(NotificationEntity),
          useClass: Repository,
        },
        {
          provide: SmsProvider,
          useValue: { send: jest.fn() },
        },
        { provide: PushProvider, useValue: {} },
        { provide: EmailProvider, useValue: {} },
        { provide: InAppProvider, useValue: {} },
      ],
    }).compile();

    processor = module.get(NotificationProcessor);
    repo = module.get(getRepositoryToken(NotificationEntity));
    smsProvider = module.get(SmsProvider);

    jest.spyOn(repo, 'update').mockResolvedValue({} as any);
  });

  it('should send notification exactly once across 3 retries', async () => {
    const job: any = {
      id: 'job-1',
      data: {
        notificationId,
        recipientId: '+2348000000000',
        channel: NotificationChannel.SMS,
        renderedBody: 'Order status updated',
      },
    };

    jest
      .spyOn(repo, 'findOne')
      .mockResolvedValueOnce({
        ...mockNotification,
        status: NotificationStatus.PENDING,
      } as any)

      .mockResolvedValueOnce({
        ...mockNotification,
        status: NotificationStatus.SENT,
      } as any)

      .mockResolvedValueOnce({
        ...mockNotification,
        status: NotificationStatus.SENT,
      } as any);

    (smsProvider.send as jest.Mock).mockResolvedValue(true);

    await processor.process(job);
    await processor.process(job);
    await processor.process(job);

    expect(smsProvider.send).toHaveBeenCalledTimes(1);
  });
});
