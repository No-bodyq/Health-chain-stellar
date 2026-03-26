import { ExecutionContext } from '@nestjs/common';

/**
 * Anonymous clients are tracked by IP; authenticated clients by user id
 * (JWT runs before the throttler guard so `req.user` is set on protected routes).
 */
export function throttleGetTracker(
  req: Record<string, any>,
  _context: ExecutionContext,
): Promise<string> {
  const user = req.user as { id?: string } | undefined;
  if (user?.id) {
    return Promise.resolve(`user:${user.id}`);
  }
  const ip =
    req.ip ??
    req.socket?.remoteAddress ??
    (Array.isArray(req.ips) && req.ips.length > 0 ? req.ips[0] : undefined) ??
    'unknown';
  return Promise.resolve(`ip:${ip}`);
}
