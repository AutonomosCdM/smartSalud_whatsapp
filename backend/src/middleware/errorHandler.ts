import { Request, Response, NextFunction } from 'express';

export default function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
