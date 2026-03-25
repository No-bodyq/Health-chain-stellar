import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Order } from './types/order.types';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/orders',
})
export class OrdersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    // Add authentication middleware
    server.use((socket: Socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization;

        if (!token) {
          this.logger.warn(
            `Connection attempt without token from ${socket.id}`,
          );
          return next(new Error('Authentication token required'));
        }

        // TODO: Validate JWT token here
        // For now, we'll accept any token
        // In production, you would:
        // 1. Verify the JWT signature
        // 2. Check token expiration
        // 3. Extract user/hospital information
        // 4. Attach user data to socket.data

        this.logger.log(`Client authenticated: ${socket.id}`);
        next();
      } catch (error) {
        this.logger.error(`Authentication error: ${error.message}`);
        next(new Error('Authentication failed'));
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:hospital')
  handleJoinHospital(client: Socket, payload: { hospitalId: string }): void {
    const { hospitalId } = payload;
    const roomName = `hospital:${hospitalId}`;

    client.join(roomName);
    this.logger.log(`Client ${client.id} joined room: ${roomName}`);

    // Send confirmation to the client
    client.emit('joined', { hospitalId, room: roomName });
  }

  /**
   * Emit order update to all clients in the hospital's room
   * @param hospitalId - The hospital ID to broadcast to
   * @param order - The updated order data
   */
  emitOrderUpdate(hospitalId: string, order: Partial<Order>): void {
    const roomName = `hospital:${hospitalId}`;
    this.logger.log(
      `Broadcasting order update to room: ${roomName}, order: ${order.id}`,
    );

    this.server.to(roomName).emit('order:updated', order);
  }
}
