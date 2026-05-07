const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const fs = require('fs');
const path = require('path');
const { getRegistry } = require('../api-registry');
const router = express.Router();

function buildAggregatedSpec() {
  const registry = getRegistry();
  const port = process.env.PORT || 3000;

  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Multi-API Mock Server',
      version: process.env.API_VERSION || '1.0.0',
      description: 'A scalable mock API server hosting multiple APIs concurrently.\n\nAll API routes are under `/api/<resource>`. Authentication, pagination, and error simulation are configurable globally.'
    },
    servers: [
      { url: `http://localhost:${port}`, description: 'Local development' }
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {},
      responses: {
        Unauthorized: {
          description: 'Authentication required or invalid credentials',
          content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' } } } } }
        }
      }
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/health': {
        get: {
          summary: 'Server health check',
          security: [],
          tags: ['Health'],
          responses: { '200': { description: 'Service is healthy' } }
        }
      },
      '/oauth/token': {
        post: {
          summary: 'OAuth 2.0 — Client Credentials Token',
          security: [],
          tags: ['OAuth'],
          description: 'Exchange client credentials for an access token. Set AUTH_MODE=oauth2 to require these tokens on API routes.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['grant_type', 'client_id', 'client_secret'],
                  properties: {
                    grant_type: { type: 'string', enum: ['client_credentials'] },
                    client_id: { type: 'string', example: 'mock-client-id' },
                    client_secret: { type: 'string', example: 'mock-client-secret' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Access token issued',
              content: { 'application/json': { schema: { type: 'object', properties: {
                access_token: { type: 'string' },
                token_type: { type: 'string', example: 'Bearer' },
                expires_in: { type: 'integer', example: 3600 }
              } } } }
            },
            '400': { description: 'Invalid grant type' },
            '401': { description: 'Invalid client credentials' }
          }
        }
      }
    },
    tags: [
      { name: 'Health', description: 'Server health monitoring' },
      { name: 'OAuth', description: 'OAuth 2.0 client credentials flow' }
    ]
  };

  // Merge each API plugin's OpenAPI spec
  const apisDir = path.join(__dirname, '../../apis');
  if (fs.existsSync(apisDir)) {
    const dirs = fs.readdirSync(apisDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const dir of dirs) {
      const specPath = path.join(apisDir, dir, 'openapi.yaml');
      if (fs.existsSync(specPath)) {
        try {
          const apiSpec = YAML.load(specPath);

          // Merge schemas
          if (apiSpec.components?.schemas) {
            Object.assign(spec.components.schemas, apiSpec.components.schemas);
          }

          // Merge paths (prefix with /api if not already)
          if (apiSpec.paths) {
            for (const [pathKey, pathValue] of Object.entries(apiSpec.paths)) {
              const fullPath = pathKey.startsWith('/api') ? pathKey : `/api${pathKey}`;
              spec.paths[fullPath] = pathValue;
            }
          }

          // Merge tags
          if (apiSpec.tags) {
            spec.tags.push(...apiSpec.tags);
          }
        } catch (err) {
          console.warn(`⚠️  Could not load OpenAPI spec for ${dir}: ${err.message}`);
        }
      }
    }
  }

  return spec;
}

router.use('/', swaggerUi.serve);
router.get('/', (req, res, next) => {
  const spec = buildAggregatedSpec();
  swaggerUi.setup(spec)(req, res, next);
});

module.exports = router;
