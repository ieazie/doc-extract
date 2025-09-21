/**
 * Custom error classes for API services
 */

export class ApiError extends Error {
  public status?: number;
  public data?: any;
  public name: string = 'ApiError';

  constructor(message: string, status?: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export class NetworkError extends ApiError {
  public name: string = 'NetworkError';

  constructor(message: string = 'Network error - please check your connection') {
    super(message);
  }
}

export class AuthenticationError extends ApiError {
  public name: string = 'AuthenticationError';
  public status: number = 401;

  constructor(message: string = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends ApiError {
  public name: string = 'AuthorizationError';
  public status: number = 403;

  constructor(message: string = 'Access denied') {
    super(message, 403);
  }
}

export class ValidationError extends ApiError {
  public name: string = 'ValidationError';
  public status: number = 400;

  constructor(message: string, data?: any) {
    super(message, 400, data);
  }
}

export class NotFoundError extends ApiError {
  public name: string = 'NotFoundError';
  public status: number = 404;

  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends ApiError {
  public name: string = 'ConflictError';
  public status: number = 409;

  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

export class RateLimitError extends ApiError {
  public name: string = 'RateLimitError';
  public status: number = 429;

  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
  }
}

export class ServerError extends ApiError {
  public name: string = 'ServerError';
  public status: number = 500;

  constructor(message: string = 'Internal server error') {
    super(message, 500);
  }
}

/**
 * Error factory for creating appropriate error types based on status code
 */
export class ErrorFactory {
  static createFromStatus(status: number, message?: string, data?: any): ApiError {
    switch (status) {
      case 400:
        return new ValidationError(message || 'Validation failed', data);
      case 401:
        return new AuthenticationError(message || 'Authentication required');
      case 403:
        return new AuthorizationError(message || 'Access denied');
      case 404:
        return new NotFoundError(message || 'Resource not found');
      case 409:
        return new ConflictError(message || 'Resource conflict');
      case 429:
        return new RateLimitError(message || 'Rate limit exceeded');
      case 500:
      case 502:
      case 503:
      case 504:
        return new ServerError(message || 'Server error');
      default:
        return new ApiError(message || 'Request failed', status, data);
    }
  }

  static createNetworkError(): NetworkError {
    return new NetworkError();
  }
}
