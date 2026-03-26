import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  afterInit(_server: Server): void {
    this.logger.log('NotificationsGateway WebSocket server initialized');
  }

  handleConnection(client: Socket): void {
    const recipientId = client.handshake.query.recipientId as string;
    if (recipientId) {
      client.join(`recipient_${recipientId}`);
      this.logger.log(
        `Client ${client.id} connected and joined room recipient_${recipientId}`,
      );
    } else {
      this.logger.log(`Client ${client.id} connected without recipientId`);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`WebSocket client disconnected: ${client.id}`);
  }

  emitToRecipient(recipientId: string, payload: any): void {
    this.server
      .to(`recipient_${recipientId}`)
      .emit('notification.new', payload);
    this.logger.log(`Emitted notification.new to recipient_${recipientId}`);
  }
}
