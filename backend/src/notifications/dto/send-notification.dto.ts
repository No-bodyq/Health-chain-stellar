import {
  IsString,
  IsArray,
  IsEnum,
  IsObject,
  IsNotEmpty,
} from 'class-validator';

import { NotificationChannel } from '../enums/notification-channel.enum';

export class SendNotificationDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @IsString()
  @IsNotEmpty()
  templateKey: string;

  @IsObject()
  variables: Record<string, string>;
}
