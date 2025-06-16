// src/infrastructure/handlers/order-created-inventory-handler.ts
import { DomainEventType, OrderCreatedEvent } from "../../domain/events";
import {
  DomainEventHandler,
  EventHandler,
} from "../../domain/interfaces/domain-event-handler";

@EventHandler(DomainEventType.ORDER_CREATED, "inventory-update-queue")
export class OrderCreatedInventoryHandler
  implements DomainEventHandler<OrderCreatedEvent>
{
  async handle(event: OrderCreatedEvent): Promise<void> {
    console.log(`Updating inventory for order: ${event.payload.orderId}`);
    await this.updateInventory(event.payload.items);
  }
  private async updateInventory(items: any[]): Promise<void> {
    for (const item of items) {
      console.log(
        `Reducing stock for product ${item.productId} by ${item.quantity}`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
}
