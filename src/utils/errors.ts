export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = "Not found", metadata?: Record<string, any>) {
    super(404, message, metadata);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = "Unauthorized", metadata?: Record<string, any>) {
    super(401, message, metadata);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = "Forbidden", metadata?: Record<string, any>) {
    super(403, message, metadata);
    this.name = "ForbiddenError";
  }
}

export class BadRequestError extends ApiError {
  constructor(message: string = "Bad request", metadata?: Record<string, any>) {
    super(400, message, metadata);
    this.name = "BadRequestError";
  }
}
