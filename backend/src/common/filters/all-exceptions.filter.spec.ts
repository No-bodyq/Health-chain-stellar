import { ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';

import { AllExceptionsFilter } from './all-exceptions.filter';
import { BlockchainException } from '../exceptions/domain.exception';

describe('AllExceptionsFilter', () => {
  it('formats domain exceptions with correlation IDs', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = {
      correlationId: 'req-123',
      method: 'POST',
      originalUrl: '/api/v1/blood-requests',
      headers: {},
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    const filter = new AllExceptionsFilter(false);
    filter.catch(new BlockchainException('Chain unavailable'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'BLOCKCHAIN_TX_FAILED',
          requestId: 'req-123',
          domain: 'blockchain',
          stack: expect.any(String),
        }),
      }),
    );
  });

  it('maps framework exceptions to standard responses', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = {
      correlationId: 'req-456',
      method: 'GET',
      originalUrl: '/api/v1/orders',
      headers: {},
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    const filter = new AllExceptionsFilter(true);
    filter.catch(new BadRequestException('Invalid query'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'INVALID_INPUT',
          requestId: 'req-456',
          stack: undefined,
        }),
      }),
    );
  });
});