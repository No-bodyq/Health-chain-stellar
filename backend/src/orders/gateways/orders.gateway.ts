import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

export interface OrderStatusUpdatedPayload {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  eventType: string;
  actorId?: string | null;
  timestamp: Date;
}

/**
 * WebSocket gateway for real-time order state-change notifications.
 *
 * Clients connect to the `/orders` namespace and listen for the
 * `order.status.updated` event.  Every valid state transition emits
 * exactly one message on that channel.
 */
@WebSocketGateway({
  namespace: '/orders',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class OrdersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  afterInit(_server: Server): void {
    this.logger.log('OrdersGateway WebSocket server initialised');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`WebSocket client disconnected: ${client.id}`);
  }

  /**
   * Broadcasts an `order.status.updated` event to all connected clients.
   * Called by OrdersService after every successful state transition.
   */
  emitOrderStatusUpdated(payload: OrderStatusUpdatedPayload): void {
    this.server.emit('order.status.updated', payload);
    this.logger.log(
      `[WS] order.status.updated — orderId=${payload.orderId} ` +
        `${payload.previousStatus} → ${payload.newStatus}`,
    );
  }
}
