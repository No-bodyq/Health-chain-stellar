import { HttpStatus } from '@nestjs/common';

import { RateLimitExceededException } from './rate-limit-exceeded.exception';

describe('RateLimitExceededException', () => {
  it('exposes 429 and structured body', () => {
    const ex = new RateLimitExceededException();
    expect(ex.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(ex.getResponse()).toMatchObject({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      error: 'Too Many Requests',
      message: expect.any(String),
    });
  });
});
