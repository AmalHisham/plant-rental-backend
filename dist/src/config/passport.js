"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const user_service_1 = require("../modules/user/service/user.service");
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (_accessToken, _refreshToken, profile, done) => {
    try {
        // Use the Google profile to create or reuse a local user record.
        const email = profile.emails?.[0]?.value ?? '';
        const name = profile.displayName ?? '';
        const result = await (0, user_service_1.findOrCreateGoogleUser)(profile.id, email, name);
        done(null, result);
    }
    catch (err) {
        done(err, undefined);
    }
}));
