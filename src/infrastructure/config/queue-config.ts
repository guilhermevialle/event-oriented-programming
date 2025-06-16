// src/infrastructure/config/queue-config.ts

export interface QueueConfig {
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

export const DEFAULT_QUEUE_CONFIG: Omit<QueueConfig, "name"> = {
  connection: {
    host: process.env.REDIS_HOST || "127.0.0.1",
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
