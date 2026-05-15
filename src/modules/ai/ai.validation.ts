import Joi from 'joi';
import { OBJECT_ID_HEX_LENGTH } from '../../config/constants';

export const visualizePlantSchema = Joi.object({
  plantId: Joi.string().length(OBJECT_ID_HEX_LENGTH).hex().required(),
}).required();
