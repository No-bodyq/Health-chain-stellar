import { BadRequestException } from '@nestjs/common';

import { OrderStatus } from '../enums/order-status.enum';

export interface TransitionErrorDetail {
  attemptedFrom: OrderStatus;
  attemptedTo: OrderStatus;
  allowedTransitions: OrderStatus[];
}

/**
 * Thrown whenever a caller attempts an illegal order state transition.
 * The response body always includes the attempted transition and the
 * list of transitions that would have been valid.
 */
export class OrderTransitionException extends BadRequestException {
  public readonly detail: TransitionErrorDetail;

  constructor(detail: TransitionErrorDetail) {
    super({
      message: `Invalid transition from '${detail.attemptedFrom}' to '${detail.attemptedTo}'`,
      error: 'OrderTransitionException',
      attemptedFrom: detail.attemptedFrom,
      attemptedTo: detail.attemptedTo,
      allowedTransitions: detail.allowedTransitions,
    });
    this.detail = detail;
  }
}
