import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { Request } from 'express';

/**
 * Admin Guard
 *
 * Protects admin endpoints by verifying admin permissions.
 *
 * Current implementation: Basic header-based authentication
 * Production implementation should use:
 * - JWT token verification
 * - Role-based access control (RBAC)
 * - Database permission checks
 * - Audit logging
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Check admin permission
    const isAdmin = this.checkAdminPermission(request);

    if (!isAdmin) {
      this.logger.warn(`Unauthorized admin access attempt from ${request.ip}`, {
        path: request.path,
        method: request.method,
      });
      throw new ForbiddenException('Admin permission required');
    }

    this.logger.debug(`Admin access granted to ${request.ip}`, {
      path: request.path,
    });
    return true;
  }

  /**
   * Check if request has admin permission.
   *
   * Current implementation: Header-based authentication
   *
   * TODO: Implement production authentication:
   * 1. JWT token verification
   *    - Extract token from Authorization header
   *    - Verify signature with public key
   *    - Check token expiration
   *    - Verify admin role in claims
   *
   * 2. Role-based access control
   *    - Query database for user roles
   *    - Check if user has 'admin' role
   *    - Cache role checks with TTL
   *
   * 3. Audit logging
   *    - Log all admin access attempts
   *    - Track who accessed what and when
   *    - Alert on suspicious patterns
   *
   * @param request - Express request object
   * @returns true if admin, false otherwise
   */
  private checkAdminPermission(request: Request): boolean {
    // Current implementation: Check X-Admin-Key header
    const adminKey = request.headers['x-admin-key'] as string;
    const expectedKey = this.configService.get<string>('ADMIN_KEY');

    if (!expectedKey) {
      this.logger.warn('ADMIN_KEY environment variable not set');
      return false;
    }

    return adminKey === expectedKey;

    // TODO: Production implementation example:
    // const authHeader = request.headers.authorization;
    // if (!authHeader?.startsWith('Bearer ')) {
    //   return false;
    // }
    //
    // const token = authHeader.substring(7);
    // try {
    //   const decoded = jwt.verify(token, this.configService.get('JWT_PUBLIC_KEY'));
    //   return decoded.role === 'admin' && !this.isTokenExpired(decoded);
    // } catch (error) {
    //   this.logger.error('JWT verification failed', error.message);
    //   return false;
    // }
  }
}
