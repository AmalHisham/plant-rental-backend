import { Schema } from 'mongoose';

// Mongoose schema for the User collection.
// Schema (structure/validation rules) is kept separate from the Model (mongoose.model() call)
// so the TypeScript interface in user.model.ts stays the single source of truth for types.
export const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    // unique: true creates a MongoDB unique index on email at the DB level.
    // lowercase + trim ensure 'User@EXAMPLE.com' and 'user@example.com' are treated as the same account.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // password is optional to support Google OAuth users who never set a password.
    // It is NOT selected by default (select: false is NOT set here) —
    // but service layer queries add .select('+password') where needed to avoid leaking it.
    password: { type: String },

    // googleId links the document to a specific Google account.
    // null for email/password users, populated on first Google sign-in.
    googleId: { type: String },

    role: {
      type: String,
      // All six roles defined here must mirror the UserRole union type in user.model.ts
      // and the authorizeRoles() calls in routes. Adding a new role requires updating all three.
      enum: ['user', 'super_admin', 'product_admin', 'order_admin', 'delivery_admin', 'user_admin'],
      default: 'user',
    },

    isActive: { type: Boolean, default: true },

    // isDeleted supports soft delete — records are never removed from MongoDB, only hidden.
    // Every service query filters { isDeleted: false } to exclude soft-deleted users.
    isDeleted: { type: Boolean, default: false },

    // passwordResetToken stores a SHA-256 hash of the raw token sent in the reset email.
    // Storing the hash prevents an attacker who reads the DB from using it directly.
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },

    // refreshToken is stored so the server can invalidate sessions (logout, soft delete).
    // Only the most recently issued refresh token is valid — old ones are replaced on each login.
    refreshToken: { type: String },
  },
  // timestamps: true adds createdAt and updatedAt fields, managed automatically by Mongoose.
  { timestamps: true }
);
