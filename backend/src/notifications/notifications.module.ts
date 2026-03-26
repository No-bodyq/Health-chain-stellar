import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationTemplateEntity } from './entities/notification-template.entity';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsGateway } from './gateways/notifications.gateway';
import { OrderNotificationListener } from './listeners/order-notification.listener';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationProcessor } from './processors/notification.processor';
import { EmailProvider } from './providers/email.provider';
import { InAppProvider } from './providers/in-app.provider';
import { PushProvider } from './providers/push.provider';
import { SmsProvider } from './providers/sms.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, NotificationTemplateEntity]),
    BullModule.registerQueue({
      name: 'notifications',
    }),
    EventEmitterModule.forRoot(),
  ],
  controllers: [NotificationsController],
  providers: [
    // Providers
    SmsProvider,
    PushProvider,
    EmailProvider,
    InAppProvider,

    // Gateways
    NotificationsGateway,

    // Processors
    NotificationProcessor,

    // Listeners
    OrderNotificationListener,

    // Service
    NotificationsService,
  ],
  exports: [NotificationsService, EmailProvider],
})
export class NotificationsModule {}
