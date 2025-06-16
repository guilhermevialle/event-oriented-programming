// src/domain/interfaces/domain-event-handler.ts
import { DomainEvent } from "../events";

export interface DomainEventHandler<T extends DomainEvent<any, any>> {
  handle(event: T): Promise<void> | void;
}

export function EventHandler(eventType: string, queueName?: string) {
  return function <T extends new (...args: any[]) => DomainEventHandler<any>>(
    constructor: T
  ) {
    Reflect.defineMetadata("eventType", eventType, constructor);
    Reflect.defineMetadata(
      "queueName",
      queueName || `${eventType}-queue`,
      constructor
    );
    Reflect.defineMetadata("isEventHandler", true, constructor);
    return constructor;
  };
}
