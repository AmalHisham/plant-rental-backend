"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_service_1 = require("../modules/user/service/user.service");
const protect = async (req, res, next) => {
    // Read the bearer token before doing any verification work.
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ success: false, message: 'No token provided' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        // Access tokens carry the user identity and role used by downstream guards.
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Look up the current user record so deleted or inactive accounts cannot keep using old tokens.
        const user = await (0, user_service_1.findUserById)(decoded.id);
        if (!user || !user.isActive) {
            res.status(401).json({ success: false, message: 'User no longer exists or is inactive' });
            return;
        }
        req.user = { id: decoded.id, role: decoded.role };
        next();
    }
    catch (err) {
        const isExpired = err instanceof Error && err.name === 'TokenExpiredError';
        const message = isExpired
            ? 'Access token expired. Please refresh.'
            : 'Invalid token';
        res.status(401).json({ success: false, message });
    }
};
exports.protect = protect;
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        const authReq = req;
        // The protect middleware stores the verified user on the request object.
        if (!authReq.user || !roles.includes(authReq.user.role)) {
            res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
            return;
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
