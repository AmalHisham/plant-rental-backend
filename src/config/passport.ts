// Passport Google OAuth strategy configuration.
// This file is imported as a side-effect in app.ts — importing it runs passport.use(),
// which registers the strategy on the global passport singleton.
// The actual authentication flow is triggered by passport.authenticate('google') in user.routes.ts.

import dotenv from 'dotenv';
dotenv.config();

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findOrCreateGoogleUser } from '../modules/user/service/user.service';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // callbackURL must exactly match the URI registered in Google Cloud Console,
      // otherwise Google will reject the OAuth redirect with a redirect_uri_mismatch error.
      callbackURL: process.env.GOOGLE_CALLBACK_URL as string,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      // _accessToken and _refreshToken are Google's OAuth tokens — not used here
      // because we issue our own JWT tokens instead of relying on Google's session.
      try {
        const email = profile.emails?.[0]?.value ?? '';
        const name = profile.displayName ?? '';
        // findOrCreateGoogleUser handles three cases:
        // 1. Existing Google-linked account — reuse it
        // 2. Existing email account — link the Google ID to it
        // 3. New user — create a fresh account
        const result = await findOrCreateGoogleUser(profile.id, email, name);
        // done(null, user) signals success; passport passes `user` to the route callback.
        done(null, result as unknown as Express.User);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  )
);
