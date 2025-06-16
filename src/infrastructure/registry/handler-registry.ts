// src/infrastructure/registry/handler-registry.ts
import "reflect-metadata";
import { DomainEventHandler } from "../../domain/interfaces/domain-event-handler";

export interface HandlerMetadata {
  eventType: string;
  queueName: string;
  handlerClass: new (...args: any[]) => DomainEventHandler<any>;
}

export class HandlerRegistry {
  private static instance: HandlerRegistry;
  private handlers: Map<string, HandlerMetadata[]> = new Map();
  private queueHandlers: Map<string, HandlerMetadata[]> = new Map();

  static getInstance(): HandlerRegistry {
    if (!HandlerRegistry.instance) {
      HandlerRegistry.instance = new HandlerRegistry();
    }
    return HandlerRegistry.instance;
  }

  registerHandler(
    handlerClass: new (...args: any[]) => DomainEventHandler<any>
  ): void {
    const isEventHandler = Reflect.getMetadata("isEventHandler", handlerClass);
    if (!isEventHandler) return;

    const eventType = Reflect.getMetadata("eventType", handlerClass);
    const queueName = Reflect.getMetadata("queueName", handlerClass);

    if (!eventType || !queueName) {
      throw new Error(
        `Handler ${handlerClass.name} is missing required metadata`
      );
    }

    const metadata: HandlerMetadata = { eventType, queueName, handlerClass };

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(metadata);

    if (!this.queueHandlers.has(queueName)) {
      this.queueHandlers.set(queueName, []);
    }
    this.queueHandlers.get(queueName)!.push(metadata);
  }

  getHandlersByEventType(eventType: string): HandlerMetadata[] {
    return this.handlers.get(eventType) || [];
  }

  getHandlersByQueue(queueName: string): HandlerMetadata[] {
    return this.queueHandlers.get(queueName) || [];
  }

  getAllQueues(): string[] {
    return Array.from(this.queueHandlers.keys());
  }

  getAllEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
