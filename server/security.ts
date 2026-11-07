import helmet from 'helmet';
import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';

/**
 * Origins the site actually loads subresources from, as opposed to merely links to.
 * Gathered by grepping the layout, the templates and every post for script, img,
 * iframe and link tags — not guessed.
 */
const CDNJS = 'https://cdnjs.cloudflare.com'; // Prism, css and js
const GOOGLE_FONTS = 'https://fonts.googleapis.com';
const GOOGLE_FONTS_FILES = 'https://fonts.gstatic.com';
const ANALYTICS = 'https://www.google-analytics.com';
const TWITTER = 'https://platform.twitter.com';
const CODEPEN = 'https://codepen.io';
const CODEPEN_ASSETS = 'https://*.codepen.io'; // assets. and static.
const YOUTUBE = 'https://www.youtube.com';
const INSTAGRAM = 'https://www.instagram.com';

/**
 * Content-Security-Policy runs in report-only to begin with. Enforcing it today
 * would need 'unsafe-inline' for scripts anyway — the analytics snippet and the
 * chart post are both inline — so it would buy little while risking a broken page.
 * Watch the reports, move the inline scripts to nonces, then switch to enforcing.
 */
const contentSecurityPolicy = {
  useDefaults: false,
  reportOnly: true,
  directives: {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", CDNJS, ANALYTICS, TWITTER, CODEPEN_ASSETS],
    'style-src': ["'self'", "'unsafe-inline'", CDNJS, GOOGLE_FONTS],
    'font-src': ["'self'", 'data:', GOOGLE_FONTS_FILES],
    // Posts embed images from a long tail of hosts; https: keeps it honest without
    // enumerating every one.
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", ANALYTICS],
    'frame-src': [CODEPEN, CODEPEN_ASSETS, YOUTUBE, TWITTER, INSTAGRAM],
  },
};

export const securityHeaders = (): RequestHandler =>
  helmet({
    contentSecurityPolicy,
    // The blog links out constantly; a bare origin referrer is the useful middle.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    // Matches frame-ancestors 'none' above. helmet defaults to SAMEORIGIN, which
    // would quietly be the weaker of the two while the CSP is still report-only.
    xFrameOptions: { action: 'deny' },
    // Six months, and no preload: preload is a one-way door for the whole domain.
    strictTransportSecurity: { maxAge: 15552000, includeSubDomains: true },
    // Served over http in dev and behind TLS termination in production, so leave
    // upgrade-insecure-requests off rather than break local development.
    crossOriginEmbedderPolicy: false,
    // Third-party embeds (codepen, youtube, twitter) need to load cross-origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

export const ORIGIN_VERIFY_HEADER = 'x-origin-verify';

/**
 * In production the app sits behind CloudFront, which adds a secret header to every
 * request it forwards. With ORIGIN_VERIFY_SECRET set, requests without it — someone
 * calling the Lambda function URL directly, skipping the cache — get a 403. Unset
 * (local development, tests) it lets everything through.
 */
export const originVerify = (secret = process.env.ORIGIN_VERIFY_SECRET): RequestHandler => {
  if (!secret) return (_req, _res, next) => next();
  const expected = Buffer.from(secret);
  return (req, res, next) => {
    const given = Buffer.from(req.get(ORIGIN_VERIFY_HEADER) ?? '');
    if (given.length === expected.length && timingSafeEqual(given, expected)) return next();
    res.status(403).type('text').send('Forbidden');
  };
};
