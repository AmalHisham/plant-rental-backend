"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Plant = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const plant_schema_1 = require("./plant.schema");
// The Plant model wraps the schema so the rest of the codebase can work with typed documents.
exports.Plant = mongoose_1.default.model('Plant', plant_schema_1.plantSchema);
