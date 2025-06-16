// src/presentation/queue-manager.ts
import { HandlerLoader } from "../application/handler-loader";
import { QueueProcessor } from "../infrastructure/processors/queue-processor";
import { EventPublisher } from "../infrastructure/publishers/event-publisher";

export class QueueManager {
  private eventPublisher: EventPublisher;
  private queueProcessor: QueueProcessor;
  private handlerLoader: HandlerLoader;

  constructor() {
    this.eventPublisher = new EventPublisher();
    this.queueProcessor = new QueueProcessor();
    this.handlerLoader = new HandlerLoader();
  }

  initialize(handlersModule: Record<string, any>): void {
    this.handlerLoader.registerHandlers(handlersModule);
    this.queueProcessor.startProcessing();
    console.log("🚀 Queue Manager initialized successfully");
  }

  getPublisher(): EventPublisher {
    return this.eventPublisher;
  }

  async shutdown(): Promise<void> {
    await Promise.all([
      this.eventPublisher.close(),
      this.queueProcessor.stop(),
    ]);
    console.log("🛑 Queue Manager shutdown completed");
  }
}
