// single-file version with no code changes except for initializing handlers array properly

import { Job, Queue, Worker } from "bullmq";
import { nanoid } from "nanoid";
import "reflect-metadata";

//#region DomainEvent and event types

enum DomainEventType {
  USER_ACCOUNT_CREATED = "user.account.created",
  ORDER_CREATED = "order.created",
  PAYMENT_PROCESSED = "payment.processed",
}

interface DomainEventProps<Type, Payload> {
  aggregateId: string;
  type: Type;
  payload: Payload;
}

class DomainEvent<Type, Payload> {
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

interface UserAccountCreatedPayload {
  name: string;
  email: string;
}

class CreatedUserAccountEvent extends DomainEvent<
  DomainEventType.USER_ACCOUNT_CREATED,
  UserAccountCreatedPayload
> {
  constructor(
    props: Omit<
      DomainEventProps<
        DomainEventType.USER_ACCOUNT_CREATED,
        UserAccountCreatedPayload
      >,
      "type"
    >
  ) {
    super({
      ...props,
      type: DomainEventType.USER_ACCOUNT_CREATED,
    });
  }
}

interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  total: number;
}

class OrderCreatedEvent extends DomainEvent<
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
//#endregion

//#region DomainEventHandler interface and EventHandler decorator

interface DomainEventHandler<T extends DomainEvent<any, any>> {
  handle(event: T): Promise<void> | void;
}

function EventHandler(eventType: string, queueName?: string) {
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
//#endregion

//#region Handlers with EventHandler decorator

@EventHandler(DomainEventType.USER_ACCOUNT_CREATED, "user-welcome-email-queue")
class UserAccountCreatedHandler
  implements DomainEventHandler<CreatedUserAccountEvent>
{
  async handle(event: CreatedUserAccountEvent): Promise<void> {
    console.log(
      `Sending welcome email to: ${event.payload.email} for user: ${event.payload.name}`
    );
    await this.sendWelcomeEmail(event.payload.email, event.payload.name);
  }
  private async sendWelcomeEmail(email: string, name: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`Welcome email sent to ${email}`);
  }
}

@EventHandler(DomainEventType.ORDER_CREATED, "order-confirmation-email-queue")
class OrderCreatedEmailHandler
  implements DomainEventHandler<OrderCreatedEvent>
{
  async handle(event: OrderCreatedEvent): Promise<void> {
    console.log(
      `Sending order confirmation email for order: ${event.payload.orderId}`
    );
    await this.sendOrderConfirmationEmail(event.payload);
  }
  private async sendOrderConfirmationEmail(payload: any): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log(`Order confirmation email sent for order ${payload.orderId}`);
  }
}

@EventHandler(DomainEventType.ORDER_CREATED, "inventory-update-queue")
class OrderCreatedInventoryHandler
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
//#endregion

//#region Queue config

interface QueueConfig {
  name: string;
  connection: {
    host: string;
    port: number;
    password?: string;
  };
  defaultJobOptions?: {
    delay?: number;
    attempts?: number;
    backoff?: {
      type: string;
      delay: number;
    };
  };
}

const DEFAULT_QUEUE_CONFIG: Omit<QueueConfig, "name"> = {
  connection: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
};
//#endregion

//#region HandlerRegistry singleton

interface HandlerMetadata {
  eventType: string;
  queueName: string;
  handlerClass: new (...args: any[]) => DomainEventHandler<any>;
}

class HandlerRegistry {
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
//#endregion

//#region EventPublisher

class EventPublisher {
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
//#endregion

//#region QueueProcessor

class QueueProcessor {
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
//#endregion

//#region HandlerLoader

class HandlerLoader {
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
//#endregion

//#region QueueManager

class QueueManager {
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
//#endregion

//#region main usage example

async function main() {
  const queueManager = new QueueManager();

  // Here is the ONLY modification you allowed:
  // Instead of passing empty array for handlers, pass all handler classes in an object
  queueManager.initialize({
    UserAccountCreatedHandler,
    OrderCreatedEmailHandler,
    OrderCreatedInventoryHandler,
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

  // Uncomment below to gracefully shutdown when needed:
  // await queueManager.shutdown();
}

// Execute only if run as main module
if (require.main === module) {
  main().catch(console.error);
}
//#endregion
