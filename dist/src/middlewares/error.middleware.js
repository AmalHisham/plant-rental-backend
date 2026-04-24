"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, _req, res, _next) => {
    // Convert common database errors into friendlier HTTP responses.
    // Invalid MongoDB ObjectId
    if (err.name === 'CastError') {
        res.status(404).json({ success: false, message: 'Resource not found' });
        return;
    }
    // Mongoose schema validation failure
    if (err.name === 'ValidationError') {
        res.status(400).json({ success: false, message: err.message });
        return;
    }
    // Duplicate key (e.g. unique email)
    if (err.code === 11000) {
        res.status(409).json({ success: false, message: 'Already exists' });
        return;
    }
    // Fall back to the status attached to AppError, or 500 if the error was unexpected.
    const status = err.status ?? 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ success: false, message });
};
exports.errorHandler = errorHandler;
