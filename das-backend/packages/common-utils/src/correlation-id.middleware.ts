// das-backend/packages/common-utils/src/correlation-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const CORRELATION_ID_HEADER = 'X-Correlation-ID';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request & { correlationId?: string }, res: Response, next: NextFunction) {
    const correlationId = req.headers[CORRELATION_ID_HEADER.toLowerCase()] as string || uuidv4();
    
    req.correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    
    next();
  }
}

// For RabbitMQ messages
export const extractCorrelationId = (headers: any): string => {
  return headers?.[CORRELATION_ID_HEADER] || headers?.correlationId || uuidv4();
};

export const injectCorrelationId = (headers: any, correlationId: string): any => {
  return {
    ...headers,
    [CORRELATION_ID_HEADER]: correlationId,
    correlationId,
  };
};