// Custom error class that carries an HTTP status code alongside the message.
// Throwing `new AppError('Not found', 404)` from a service lets the global errorHandler
// in error.middleware.ts read err.status and respond with the correct HTTP code,
// without needing any try-catch blocks in controllers.
export class AppError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message); // sets this.message via the native Error constructor
    this.name = 'AppError'; // helps errorHandler distinguish intentional errors from unexpected ones
    this.status = status;
  }
}
