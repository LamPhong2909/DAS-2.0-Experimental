// das-backend/packages/common-errors/src/index.ts
export class DasError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export class ValidationError extends DasError {
  constructor(message: string, details?: any) {
    super('DAS-VAL-001', message, 400, details);
  }
}

export class NotFoundError extends DasError {
  constructor(resource: string, id: string) {
    super('DAS-NOT-001', `${resource} with id ${id} not found`, 404);
  }
}

export class ConflictError extends DasError {
  constructor(message: string, details?: any) {
    super('DAS-CON-001', message, 409, details);
  }
}

export class AuthenticationError extends DasError {
  constructor(message: string = 'Authentication required') {
    super('DAS-AUTH-001', message, 401);
  }
}

export class AuthorizationError extends DasError {
  constructor(message: string = 'Insufficient permissions') {
    super('DAS-AUTH-002', message, 403);
  }
}

export class ServiceUnavailableError extends DasError {
  constructor(service: string, details?: any) {
    super('DAS-SVC-001', `Service ${service} is temporarily unavailable`, 503, details);
  }
}

// Service-specific errors
export class ScrapingError extends DasError {
  constructor(url: string, reason: string) {
    super('DAS-DAM-001', `Failed to scrape ${url}: ${reason}`, 500, { url, reason });
  }
}

export class AugmentationError extends DasError {
  constructor(message: string, details?: any) {
    super('DAS-EAPP-001', message, 500, details);
  }
}

export class AnalysisError extends DasError {
  constructor(message: string, details?: any) {
    super('DAS-TAID-001', message, 500, details);
  }
}