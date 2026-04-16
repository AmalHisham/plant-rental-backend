import { Schema } from 'mongoose';

export const wishlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    plants: [
      {
        plantId: { type: Schema.Types.ObjectId, ref: 'Plant', required: true },
      },
    ],
  },
  { timestamps: true }
);
