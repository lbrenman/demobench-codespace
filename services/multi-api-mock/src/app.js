const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { loadApis } = require('./core/api-loader');
const authMiddleware = require('./middleware/auth');
const errorSimulator = require('./middleware/error-simulator');
const { getRegistry, recordRequest } = require('./core/api-registry');
const healthRouter = require('./core/routes/health');
const apiDocsRouter = require('./core/routes/apidocs');
const oauthRouter = require('./core/routes/oauth');
const adminRouter = require('./core/routes/admin');

const app = express();

// Trust proxy — required for Codespaces and reverse-proxied environments
app.set('trust proxy', 1);

// Core middleware
app.use(express.json());
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'combined'));

// Rate limiter
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false }
});
app.use(limiter);

// ── Unauthenticated routes ──────────────────────────────────
app.use('/health', healthRouter);
app.use('/api-docs', apiDocsRouter);
app.use('/oauth', oauthRouter);
app.use('/admin', adminRouter);

// Serve admin portal static files
app.use('/admin-assets', express.static(path.join(__dirname, '../public')));

// ── Global request tracking (BEFORE auth & error sim) ───────
// This ensures ALL /api/* requests are logged, including 401 auth
// rejections, simulated 429/500 errors, and successful requests.
app.use('/api', (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    // Resolve the API name from the URL path
    const registry = getRegistry();
    const pathSegments = req.originalUrl.replace(/^\/api\//, '').split('/');
    const basePath = pathSegments[0];
    let apiName = 'Unknown';
    for (const [name, info] of registry) {
      if (info.basePath === basePath) {
        apiName = name;
        break;
      }
    }
    recordRequest(apiName, {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration: Date.now() - start
    });
  });
  next();
});

// ── Error simulation (before auth, applies to API routes) ───
app.use('/api', errorSimulator);

// ── Auth middleware (applies to all /api/* routes) ──────────
app.use('/api', authMiddleware);

// ── Auto-discover and mount API plugins ─────────────────────
loadApis(app);

// ── 404 handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
