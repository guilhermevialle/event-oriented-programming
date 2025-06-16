// src/main.ts
import "reflect-metadata"; // Ensure this is imported once at the entry point
import { CreatedUserAccountEvent, OrderCreatedEvent } from "./domain/events";
import * as handlers from "./infrastructure/handlers";
import { QueueManager } from "./presentation/queue-manager";

async function main() {
  const queueManager = new QueueManager();

  queueManager.initialize({
    ...handlers,
  });

  const publisher = queueManager.getPublisher();

  const userEvent = new CreatedUserAccountEvent({
    aggregateId: "user-123",
    payload: {
      name: "João Silva",
      email: "joao@example.com",
    },
  });

  await publisher.publish(userEvent);

  const orderEvent = new OrderCreatedEvent({
    aggregateId: "order-456",
    payload: {
      orderId: "order-456",
      customerId: "user-123",
      items: [
        { productId: "prod-1", quantity: 2, price: 50.0 },
        { productId: "prod-2", quantity: 1, price: 30.0 },
      ],
      total: 130.0,
    },
  });

  await publisher.publish(orderEvent);

  console.log("🎉 Events published successfully!");
}

if (require.main === module) {
  main().catch(console.error);
}
