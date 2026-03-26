import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';

import type { Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = HttpStatus.TOO_MANY_REQUESTS;
    const raw = typeof exception.message === 'string' ? exception.message : '';
    const message =
      raw.replace(/^ThrottlerException:\s*/i, '').trim() ||
      'Rate limit exceeded. Please try again later.';

    response.status(status).json({
      statusCode: status,
      error: 'Too Many Requests',
      message,
    });
  }
}
