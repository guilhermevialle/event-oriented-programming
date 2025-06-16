// src/application/handler-loader.ts
import "reflect-metadata";
import { HandlerRegistry } from "../infrastructure/registry/handler-registry";

export class HandlerLoader {
  private handlerRegistry: HandlerRegistry;

  constructor() {
    this.handlerRegistry = HandlerRegistry.getInstance();
  }

  registerHandlers(handlersModule: Record<string, any>): void {
    let registeredCount = 0;

    for (const [Name, edItem] of Object.entries(handlersModule)) {
      if (this.isHandlerClass(edItem)) {
        this.handlerRegistry.registerHandler(edItem);
        registeredCount++;
        console.log(`✓ Registered handler: ${Name}`);
      }
    }

    console.log(`📦 Successfully registered ${registeredCount} handler(s)`);
  }

  private isHandlerClass(item: any): boolean {
    return (
      typeof item === "function" &&
      item.prototype &&
      Reflect.getMetadata("isEventHandler", item) === true
    );
  }
}
