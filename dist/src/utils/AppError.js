"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    constructor(message, status) {
        super(message);
        // Preserve the HTTP status so the error handler can respond consistently.
        this.name = 'AppError';
        this.status = status;
    }
}
exports.AppError = AppError;
