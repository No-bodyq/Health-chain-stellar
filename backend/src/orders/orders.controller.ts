import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Request,
  ValidationPipe,
} from '@nestjs/common';

import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';

import { OrderQueryParamsDto } from './dto/order-query-params.dto';
import { OrdersResponseDto } from './dto/orders-response.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @RequirePermissions(Permission.VIEW_ORDER)
  @Get()
  async findAllWithFilters(
    @Query(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
        exceptionFactory: (errors) => {
          const messages = errors.map((error) => {
            const constraints = error.constraints;
            return constraints
              ? Object.values(constraints).join(', ')
              : 'Invalid parameter';
          });
          return new BadRequestException({
            statusCode: 400,
            message: 'Invalid query parameters',
            errors: messages,
          });
        },
      }),
    )
    params: OrderQueryParamsDto,
  ): Promise<OrdersResponseDto> {
    // Additional validation for date range
    if (params.startDate && params.endDate) {
      const start = new Date(params.startDate);
      const end = new Date(params.endDate);
      if (start > end) {
        throw new BadRequestException(
          'startDate must be before or equal to endDate',
        );
      }
    }

    return this.ordersService.findAllWithFilters(params);
  }

  @RequirePermissions(Permission.VIEW_ORDER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  /**
   * GET /orders/:id/history
   * Returns the full, chronologically-ordered event log for an order.
   * Each row contains: order_id, event_type, payload, actor_id, timestamp.
   */
  @RequirePermissions(Permission.VIEW_ORDER)
  @Get(':id/history')
  getOrderHistory(@Param('id') id: string) {
    return this.ordersService.getOrderHistory(id);
  }

  @RequirePermissions(Permission.VIEW_ORDER)
  @Get(':id/track')
  trackOrder(@Param('id') id: string) {
    return this.ordersService.trackOrder(id);
  }

  @RequirePermissions(Permission.CREATE_ORDER)
  @Post()
  create(@Body() createOrderDto: any, @Request() req: any) {
    const actorId: string | undefined = req.user?.id;
    return this.ordersService.create(createOrderDto, actorId);
  }

  @RequirePermissions(Permission.UPDATE_ORDER)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: any) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @RequirePermissions(Permission.UPDATE_ORDER)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Request() req: any,
  ) {
    const actorId: string | undefined = req.user?.id;
    return this.ordersService.updateStatus(id, status, actorId);
  }

  @RequirePermissions(Permission.MANAGE_RIDERS)
  @Patch(':id/assign-rider')
  assignRider(
    @Param('id') id: string,
    @Body('riderId') riderId: string,
    @Request() req: any,
  ) {
    const actorId: string | undefined = req.user?.id;
    return this.ordersService.assignRider(id, riderId, actorId);
  }

  @RequirePermissions(Permission.UPDATE_ORDER)
  @Patch(':id/raise-dispute')
  raiseDispute(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('disputeId') disputeId: string,
    @Request() req: any,
  ) {
    const actorId: string | undefined = req.user?.id;
    return this.ordersService.raiseDispute(id, reason, disputeId, actorId);
  }

  @RequirePermissions(Permission.UPDATE_ORDER) // Admin or specialized permission
  @Patch(':id/resolve-dispute')
  resolveDispute(
    @Param('id') id: string,
    @Body('resolution') resolution: string,
    @Request() req: any,
  ) {
    const actorId: string | undefined = req.user?.id;
    return this.ordersService.resolveDispute(id, resolution, actorId);
  }

  @RequirePermissions(Permission.DELETE_ORDER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req: any) {
    const actorId: string | undefined = req.user?.id;
    return this.ordersService.remove(id, actorId);
  }
}
