import { Request, Response, NextFunction } from 'express';

// Production error handler - sanitizes error messages
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error details server-side (not exposed to client)
  if (process.env.NODE_ENV === 'production') {
    // In production, log to a proper logging service
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  } else {
    // In development, show full error
    console.error('Error:', err);
  }

  // Return sanitized error to client
  const statusCode = (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An error occurred. Please try again later.'
    : err.message;

  res.status(statusCode).json({
    success: false,
    message: message
  });
};

