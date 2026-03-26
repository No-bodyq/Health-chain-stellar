import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import request from 'supertest';

@Controller('throttle-test')
class ThrottleProbeController {
  @Get()
  probe() {
    return { ok: true };
  }
}

describe('ThrottlerModule (in-memory)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [{ name: 'default', ttl: 60_000, limit: 2 }],
        }),
      ],
      controllers: [ThrottleProbeController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows requests up to the limit', async () => {
    await request(app.getHttpServer()).get('/throttle-test').expect(200);
    await request(app.getHttpServer()).get('/throttle-test').expect(200);
  });

  it('returns 429 when exceeded; successful responses include rate limit headers', async () => {
    const first = await request(app.getHttpServer())
      .get('/throttle-test')
      .expect(200);
    expect(first.headers['x-ratelimit-limit']).toBe('2');
    expect(first.headers['x-ratelimit-remaining']).toBeDefined();
    expect(first.headers['x-ratelimit-reset']).toBeDefined();

    await request(app.getHttpServer()).get('/throttle-test').expect(200);

    const blocked = await request(app.getHttpServer())
      .get('/throttle-test')
      .expect(429);
    expect(blocked.headers['retry-after']).toBeDefined();
  });
});
