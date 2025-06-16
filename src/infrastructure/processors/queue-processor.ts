// src/infrastructure/processors/queue-processor.ts
import { Job, Worker } from "bullmq";
import { DomainEvent } from "../../domain/events"; // Import DomainEvent and DomainEventType
import { DEFAULT_QUEUE_CONFIG } from "../config/queue-config";
import { HandlerRegistry } from "../registry/handler-registry";

export class QueueProcessor {
  private workers: Map<string, Worker> = new Map();
  private handlerRegistry: HandlerRegistry;
  private handlerInstances: Map<string, any> = new Map();

  constructor() {
    this.handlerRegistry = HandlerRegistry.getInstance();
  }

  private getHandlerInstance(handlerClass: new (...args: any[]) => any): any {
    const className = handlerClass.name;
    if (!this.handlerInstances.has(className)) {
      this.handlerInstances.set(className, new handlerClass());
    }
    return this.handlerInstances.get(className);
  }

  startProcessing(): void {
    const allQueues = this.handlerRegistry.getAllQueues();

    for (const queueName of allQueues) {
      this.createWorkerForQueue(queueName);
    }

    console.log(
      `Started processing ${allQueues.length} queue(s): ${allQueues.join(", ")}`
    );
  }

  private createWorkerForQueue(queueName: string): void {
    if (this.workers.has(queueName)) return;

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        await this.processJob(queueName, job);
      },
      {
        connection: DEFAULT_QUEUE_CONFIG.connection,
        concurrency: 5,
      }
    );

    worker.on("completed", (job) => {
      console.log(`Job ${job.id} completed in queue ${queueName}`);
    });

    worker.on("failed", (job, err) => {
      console.error(
        `Job ${job?.id} failed in queue ${queueName}:`,
        err.message
      );
    });

    this.workers.set(queueName, worker);
  }

  private async processJob(queueName: string, job: Job): Promise<void> {
    const { handlerClass: handlerClassName, event: eventData } = job.data;
    const handlers = this.handlerRegistry.getHandlersByQueue(queueName);
    const handler = handlers.find(
      (h) => h.handlerClass.name === handlerClassName
    );

    if (!handler) {
      throw new Error(
        `Handler ${handlerClassName} not found for queue ${queueName}`
      );
    }

    const handlerInstance = this.getHandlerInstance(handler.handlerClass);
    const event = this.reconstructEvent(eventData);

    await handlerInstance.handle(event);
  }

  private reconstructEvent(eventData: any): DomainEvent<any, any> {
    // Minimal reconstruction, in real cases consider factory method
    return {
      aggregateId: eventData.aggregateId,
      eventId: eventData.eventId,
      occurredOn: new Date(eventData.occurredOn),
      type: eventData.type,
      payload: eventData.payload,
    } as DomainEvent<any, any>;
  }

  async stop(): Promise<void> {
    await Promise.all(
      Array.from(this.workers.values()).map((worker) => worker.close())
    );
  }
}
