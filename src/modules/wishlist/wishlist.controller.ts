import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { getWishlist, addToWishlist, removeFromWishlist } from './wishlist.service';
import { plantIdParamsSchema } from './wishlist.validation';

export const getWishlistHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const wishlist = await getWishlist(req.user!.id);
  res.status(200).json({ success: true, data: { wishlist } });
};

export const addToWishlistHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  // plantId comes from the route param (:plantId) — validated before the service runs.
  const { error, value } = plantIdParamsSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const wishlist = await addToWishlist(req.user!.id, value.plantId);
  res.status(200).json({ success: true, data: { wishlist } });
};

export const removeFromWishlistHandler = async (req: AuthRequest, res: Response): Promise<void> => {
  const { error, value } = plantIdParamsSchema.validate(req.params);
  if (error) {
    res.status(400).json({ success: false, message: error.details[0].message });
    return;
  }
  const wishlist = await removeFromWishlist(req.user!.id, value.plantId);
  res.status(200).json({ success: true, data: { wishlist } });
};
