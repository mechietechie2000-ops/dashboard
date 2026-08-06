const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_PER_WINDOW = 20;

// Runs first, before authenticate — protects against anonymous/pre-auth
// hammering (e.g. someone spraying invalid tokens at the route).
// ipKeyGenerator normalizes IPv6 addresses (collapses to a /64-ish
// prefix) so a client can't dodge the limit by varying the low bits of
// their address; a raw `req.ip` string wouldn't do that.
const ipUploadLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_PER_WINDOW,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  handler: (req, res) => {
    res.status(429).json({
      error:
        "Too many upload attempts from this network. Please try again later.",
    });
  },
});

// Runs after authenticate — req.user is guaranteed to be populated here,
// so this catches a single compromised/shared account cycling IPs. Keyed
// on user id, not IP, so no ipKeyGenerator needed here.
const userUploadLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_PER_WINDOW,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user:${req.user && req.user.userId}`,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many uploads from your account. Please try again later.",
    });
  },
});

module.exports = { ipUploadLimiter, userUploadLimiter };
