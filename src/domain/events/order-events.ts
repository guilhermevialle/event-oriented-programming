// src/domain/events/order-events.ts
import { DomainEvent, DomainEventProps, DomainEventType } from "./domain-event";

export interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
}

export class OrderCreatedEvent extends DomainEvent<
  DomainEventType.ORDER_CREATED,
  OrderCreatedPayload
> {
  constructor(
    props: Omit<
      DomainEventProps<DomainEventType.ORDER_CREATED, OrderCreatedPayload>,
      "type"
    >
  ) {
    super({
      ...props,
      type: DomainEventType.ORDER_CREATED,
    });
  }
}
