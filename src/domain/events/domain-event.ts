// src/domain/events/domain-event.ts
import { nanoid } from "nanoid";

export enum DomainEventType {
  USER_ACCOUNT_CREATED = "user.account.created",
  ORDER_CREATED = "order.created",
  PAYMENT_PROCESSED = "payment.processed",
}

export interface DomainEventProps<Type, Payload> {
  aggregateId: string;
  type: Type;
  payload: Payload;
}

export class DomainEvent<Type, Payload> {
  private readonly _occurredOn: Date = new Date();
  private readonly _eventId: string = nanoid(21);

  constructor(private readonly props: DomainEventProps<Type, Payload>) {}

  get aggregateId(): string {
    return this.props.aggregateId;
  }

  get occurredOn(): Date {
    return this._occurredOn;
  }

  get eventId(): string {
    return this._eventId;
  }

  get type(): Type {
    return this.props.type;
  }

  get payload(): Payload {
    return this.props.payload;
  }

  toJSON() {
    return {
      aggregateId: this.aggregateId,
      eventId: this.eventId,
      occurredOn: this.occurredOn,
      type: this.type,
      payload: this.payload,
    };
  }
}
