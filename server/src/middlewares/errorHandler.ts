import { Request, Response, NextFunction } from 'express';

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Always log the error on the server for debugging
  console.error(`[Error] ${req.method} ${req.url}:`, err.message || err);

  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof Error) {
    message = err.message;

    // Map business logic errors from inventory.service.ts to HTTP status codes
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('not found')) {
      statusCode = 404; // Not Found
    } else if (
      lowerMessage.includes('insufficient stock') || 
      lowerMessage.includes('negative') || 
      lowerMessage.includes('positive') ||
      lowerMessage.includes('greater than zero')
    ) {
      statusCode = 400; // Bad Request (Validation failure)
    } else if (lowerMessage.includes('forbidden') || lowerMessage.includes('requires one of')) {
      statusCode = 403; // Forbidden (RBAC failure)
    } else if (lowerMessage.includes('unauthorized') || lowerMessage.includes('invalid token')) {
      statusCode = 401; // Unauthorized (Auth failure)
    }
  }

  // Catch Firebase Admin SDK specific errors
  if (err.code && typeof err.code === 'string') {
    if (err.code.startsWith('auth/')) {
      statusCode = 401;
      message = 'Authentication error';
    } else if (err.code.startsWith('firestore/')) {
      statusCode = 503; // Service Unavailable / Database Error
      message = 'Database operation failed';
    }
  }

  // Send the standardized JSON response
  res.status(statusCode).json({ error: message });
};