import { Controller, Get } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /** Custom limit example: tighter than the global 100/min default. */
  @Throttle({ default: { limit: 50, ttl: 60_000 } })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @SkipThrottle()
  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }
}
