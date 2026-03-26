import { HttpException, HttpStatus } from '@nestjs/common';

/** Structured 429 payload; use with ThrottlerExceptionFilter for consistent JSON. */
export class RateLimitExceededException extends HttpException {
  constructor(message = 'Rate limit exceeded. Please try again later.') {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
