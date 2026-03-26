import { Injectable, Logger } from '@nestjs/common';

import { UssdStateMachine } from './ussd-state-machine.service';
import { UssdSession, UssdRequest, UssdResponse } from './ussd.types';

/**
 * Minimal interface that the USSD module expects from OrderService.
 * The real OrderService lives in the orders module – inject it via DI.
 */
export interface IOrderService {
  createOrder(params: {
    userId: string;
    bloodType: string;
    quantity: number;
    bloodBankId: string;
    channel: string;
  }): Promise<{ id: string }>;
}

@Injectable()
export class UssdService {
  private readonly logger = new Logger(UssdService.name);

  constructor(
    private readonly stateMachine: UssdStateMachine,
    private readonly orderService: IOrderService,
  ) {}

  async handleSession(request: UssdRequest): Promise<UssdResponse> {
    const { sessionId, phoneNumber, text } = request;

    this.logger.debug(
      `USSD session ${sessionId} | phone ${phoneNumber} | text "${text}"`,
    );

    return this.stateMachine.process(sessionId, phoneNumber, text, (session) =>
      this.placeOrder(session),
    );
  }

  private async placeOrder(session: UssdSession): Promise<void> {
    if (
      !session.userId ||
      !session.selectedBloodType ||
      !session.selectedQuantity ||
      !session.selectedBloodBankId
    ) {
      throw new Error('Incomplete session data for order creation');
    }

    await this.orderService.createOrder({
      userId: session.userId,
      bloodType: session.selectedBloodType,
      quantity: session.selectedQuantity,
      bloodBankId: session.selectedBloodBankId,
      channel: 'USSD',
    });

    this.logger.log(
      `Order placed via USSD | user ${session.userId} | ${session.selectedBloodType} x${session.selectedQuantity} from ${session.selectedBloodBankId}`,
    );
  }
}
