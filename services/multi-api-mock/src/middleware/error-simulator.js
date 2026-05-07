/**
 * Error Simulation Middleware
 * Injects configurable error rates for testing client retry logic,
 * rate limiting behavior, and server error handling.
 *
 * Controlled via env vars:
 *   ERROR_RATE_500        — probability (0.0–1.0) of returning HTTP 500
 *   ERROR_RATE_429        — probability (0.0–1.0) of returning HTTP 429
 *   ERROR_RATE_TIMEOUT    — probability (0.0–1.0) of simulating a timeout
 *   ERROR_TIMEOUT_DELAY_MS — how long to wait before timing out (default 30000)
 */

function errorSimulator(req, res, next) {
  const rate500 = parseFloat(process.env.ERROR_RATE_500 || '0');
  const rate429 = parseFloat(process.env.ERROR_RATE_429 || '0');
  const rateTimeout = parseFloat(process.env.ERROR_RATE_TIMEOUT || '0');

  const roll = Math.random();

  // Check 500 first
  if (rate500 > 0 && roll < rate500) {
    return res.status(500).json({
      error: 'Internal Server Error (simulated)',
      simulated: true
    });
  }

  // Check 429 rate limit
  if (rate429 > 0 && roll < rate500 + rate429) {
    const retryAfter = Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10) / 1000);
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Too Many Requests (simulated)',
      retry_after: retryAfter,
      simulated: true
    });
  }

  // Check timeout
  if (rateTimeout > 0 && roll < rate500 + rate429 + rateTimeout) {
    const delay = parseInt(process.env.ERROR_TIMEOUT_DELAY_MS || '30000', 10);
    // Just hold the connection open, don't respond
    setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          error: 'Gateway Timeout (simulated)',
          simulated: true
        });
      }
    }, delay);
    return; // Don't call next()
  }

  next();
}

module.exports = errorSimulator;
