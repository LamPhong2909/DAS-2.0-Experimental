// das-backend/packages/common-utils/src/logger.ts
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const correlationIdFormat = winston.format((info) => {
  info.correlationId = info.correlationId || 'no-correlation-id';
  return info;
});

const errorStackFormat = winston.format((info) => {
  if (info.error instanceof Error) {
    info.stack = info.error.stack;
    info.errorMessage = info.error.message;
    info.errorCode = (info.error as any).code;
  }
  return info;
});

export const createLogger = (serviceName: string) => {
  const logger = winston.createLogger({
    defaultMeta: { service: serviceName },
    format: winston.format.combine(
      winston.format.timestamp(),
      correlationIdFormat(),
      errorStackFormat(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple(),
        ),
      }),
    ],
  });

  // Add Elasticsearch transport in production
  if (process.env.NODE_ENV === 'production' && process.env.ELASTICSEARCH_URL) {
    logger.add(
      new ElasticsearchTransport({
        level: 'info',
        clientOpts: {
          node: process.env.ELASTICSEARCH_URL,
          auth: {
            username: process.env.ELASTICSEARCH_USER || 'elastic',
            password: process.env.ELASTICSEARCH_PASSWORD || 'changeme',
          },
        },
        index: `das-logs-${serviceName}`,
        dataStream: true,
      }),
    );
  }

  return logger;
};

// Create child logger with correlation ID
export const createChildLogger = (logger: winston.Logger, correlationId: string) => {
  return logger.child({ correlationId });
};