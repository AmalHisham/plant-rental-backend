import { Schema } from 'mongoose';

export const plantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    pricePerDay: { type: Number, required: true, min: 0 },

    // depositAmount is stored separately from pricePerDay because it follows its own
    // lifecycle — held until the plant is returned undamaged, then potentially refunded.
    depositAmount: { type: Number, required: true, min: 0 },

    stock: { type: Number, required: true, min: 0, default: 0 },
    careLevel: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    images: [{ type: String }], // array of image URLs; empty for seeded plants
    isAvailable: { type: Boolean, default: true },

    // isDeleted supports soft delete — orders placed on a deleted plant still resolve
    // to the plant document (for history), but it no longer appears in browse listings.
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound text index on name + category + description enables MongoDB full-text search
// ($text operator) so a single search query checks all three fields simultaneously.
// Without this index, text search falls back to slow collection scans.
plantSchema.index({ name: 'text', category: 'text', description: 'text' });
