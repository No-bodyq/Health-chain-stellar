import { Test, TestingModule } from '@nestjs/testing';
import { OrdersGateway } from './orders.gateway';
import { Server, Socket } from 'socket.io';
import { Order, OrderStatus } from './types/order.types';

describe('OrdersGateway', () => {
  let gateway: OrdersGateway;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      use: jest.fn(),
    };

    mockSocket = {
      id: 'test-socket-id',
      join: jest.fn(),
      emit: jest.fn(),
      handshake: {
        auth: { token: 'test-token' },
        headers: {},
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersGateway],
    }).compile();

    gateway = module.get<OrdersGateway>(OrdersGateway);
    gateway.server = mockServer as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should set up authentication middleware', () => {
      gateway.afterInit(mockServer as Server);
      expect(mockServer.use).toHaveBeenCalled();
    });
  });

  describe('handleConnection', () => {
    it('should log client connection', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      gateway.handleConnection(mockSocket as Socket);
      expect(logSpy).toHaveBeenCalledWith(`Client connected: ${mockSocket.id}`);
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      gateway.handleDisconnect(mockSocket as Socket);
      expect(logSpy).toHaveBeenCalledWith(
        `Client disconnected: ${mockSocket.id}`,
      );
    });
  });

  describe('handleJoinHospital', () => {
    it('should join client to hospital room', () => {
      const hospitalId = 'HOSP-001';
      gateway.handleJoinHospital(mockSocket as Socket, { hospitalId });

      expect(mockSocket.join).toHaveBeenCalledWith(`hospital:${hospitalId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('joined', {
        hospitalId,
        room: `hospital:${hospitalId}`,
      });
    });

    it('should log room join', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      const hospitalId = 'HOSP-001';

      gateway.handleJoinHospital(mockSocket as Socket, { hospitalId });

      expect(logSpy).toHaveBeenCalledWith(
        `Client ${mockSocket.id} joined room: hospital:${hospitalId}`,
      );
    });
  });

  describe('emitOrderUpdate', () => {
    it('should broadcast order update to hospital room', () => {
      const hospitalId = 'HOSP-001';
      const orderUpdate: Partial<Order> = {
        id: 'ORD-001',
        status: 'in_transit' as OrderStatus,
        updatedAt: new Date(),
      };

      gateway.emitOrderUpdate(hospitalId, orderUpdate);

      expect(mockServer.to).toHaveBeenCalledWith(`hospital:${hospitalId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'order:updated',
        orderUpdate,
      );
    });

    it('should log broadcast action', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');
      const hospitalId = 'HOSP-001';
      const orderUpdate: Partial<Order> = {
        id: 'ORD-001',
        status: 'delivered' as OrderStatus,
      };

      gateway.emitOrderUpdate(hospitalId, orderUpdate);

      expect(logSpy).toHaveBeenCalledWith(
        `Broadcasting order update to room: hospital:${hospitalId}, order: ${orderUpdate.id}`,
      );
    });
  });
});
