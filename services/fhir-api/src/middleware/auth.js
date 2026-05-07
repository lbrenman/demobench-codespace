module.exports = function authMiddleware(req, res, next) {
  const mode = process.env.AUTH_MODE || 'apikey';

  if (mode === 'none') {
    return next();
  }

  // Default: apikey mode
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};
