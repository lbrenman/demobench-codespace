const jwt = require('jsonwebtoken');

/**
 * Auth middleware — switches on AUTH_MODE env var.
 * Applied globally to all /api/* routes.
 */
function authMiddleware(req, res, next) {
  const mode = (process.env.AUTH_MODE || 'apikey').toLowerCase();

  switch (mode) {
    case 'none':
      return next();

    case 'apikey':
      return apiKeyAuth(req, res, next);

    case 'token':
      return tokenAuth(req, res, next);

    case 'oauth2':
      return oauth2Auth(req, res, next);

    default:
      console.warn(`Unknown AUTH_MODE "${mode}", falling back to apikey`);
      return apiKeyAuth(req, res, next);
  }
}

function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }
  if (key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

function tokenAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Expected: Bearer <token>' });
  }
  const token = authHeader.slice(7);
  if (token !== process.env.TOKEN_SECRET) {
    return res.status(401).json({ error: 'Invalid bearer token' });
  }
  next();
}

function oauth2Auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Expected: Bearer <access_token>' });
  }
  const token = authHeader.slice(7);
  const secret = process.env.OAUTH_JWT_SECRET || 'change-this-to-a-random-secret';

  try {
    const decoded = jwt.verify(token, secret);
    req.oauth = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    }
    return res.status(401).json({ error: 'Invalid access token' });
  }
}

module.exports = authMiddleware;
