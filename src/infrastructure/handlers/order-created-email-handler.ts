// src/infrastructure/handlers/order-created-email-handler.ts
import { DomainEventType, OrderCreatedEvent } from "../../domain/events";
import {
  DomainEventHandler,
  EventHandler,
} from "../../domain/interfaces/domain-event-handler";

@EventHandler(DomainEventType.ORDER_CREATED, "order-confirmation-email-queue")
export class OrderCreatedEmailHandler
  implements DomainEventHandler<OrderCreatedEvent>
{
  async handle(event: OrderCreatedEvent): Promise<void> {
    console.log(
      `Sending order confirmation email for order: ${event.payload.orderId}`
    );
    await this.sendOrderConfirmationEmail(event.payload);
  }
  private async sendOrderConfirmationEmail(payload: any): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log(`Order confirmation email sent for order ${payload.orderId}`);
  }
}
