const { rateLimit } = require("express-rate-limit");

const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  message: {
    error: {
      message: "Too many analyses - please wait a minute and retry.",
    },
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  message: {
    error: {
      message: "Too many auth attempts - please wait and retry.",
    },
  },
});

module.exports = {
  analyzeLimiter,
  authLimiter,
};