// src/infrastructure/publishers/event-publisher.ts
import { Queue } from "bullmq";
import { DomainEvent } from "../../domain/events";
import { DEFAULT_QUEUE_CONFIG } from "../config/queue-config";
import { HandlerRegistry } from "../registry/handler-registry";

export class EventPublisher {
  private queues: Map<string, Queue> = new Map();
  private handlerRegistry: HandlerRegistry;

  constructor() {
    this.handlerRegistry = HandlerRegistry.getInstance();
  }

  private getOrCreateQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: DEFAULT_QUEUE_CONFIG.connection,
        defaultJobOptions: DEFAULT_QUEUE_CONFIG.defaultJobOptions,
      });
      this.queues.set(queueName, queue);
    }
    return this.queues.get(queueName)!;
  }

  async publish<T extends DomainEvent<any, any>>(event: T): Promise<void> {
    const handlers = this.handlerRegistry.getHandlersByEventType(
      event.type as string
    );

    if (handlers.length === 0) {
      console.warn(`No handlers registered for event type: ${event.type}`);
      return;
    }

    const queueJobs = new Map<string, any[]>();

    for (const handler of handlers) {
      if (!queueJobs.has(handler.queueName)) {
        queueJobs.set(handler.queueName, []);
      }
      queueJobs.get(handler.queueName)!.push({
        handlerClass: handler.handlerClass.name,
        event: event.toJSON(),
      });
    }

    const promises = Array.from(queueJobs.entries()).map(
      async ([queueName, jobs]) => {
        const queue = this.getOrCreateQueue(queueName);
        return Promise.all(
          jobs.map((job) =>
            queue.add(`${event.type}-${job.handlerClass}`, job, {
              jobId: `${event.eventId}-${job.handlerClass}`,
              removeOnComplete: 10,
              removeOnFail: 50,
            })
          )
        );
      }
    );

    await Promise.all(promises);
    console.log(`Event ${event.type} published to ${queueJobs.size} queue(s)`);
  }

  async close(): Promise<void> {
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close())
    );
  }
}
