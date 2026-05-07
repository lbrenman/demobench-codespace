'use strict';

const http  = require('http');
const https = require('https');

/**
 * Performs a simple HTTP GET health check.
 * Returns { healthy: bool, statusCode: number|null, latencyMs: number }
 */
function checkHealth(port, pathname = '/health', timeoutMs = 3000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const url   = `http://localhost:${port}${pathname}`;

    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      const latencyMs = Date.now() - start;
      // Drain response body
      res.resume();
      resolve({
        healthy:    res.statusCode < 500,
        statusCode: res.statusCode,
        latencyMs,
      });
    });

    req.on('error', () => {
      resolve({ healthy: false, statusCode: null, latencyMs: Date.now() - start });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ healthy: false, statusCode: null, latencyMs: timeoutMs });
    });
  });
}

/**
 * Checks health for all services in the manifest that have a healthPath.
 * Returns a map of { serviceId → healthResult }
 */
async function checkAllServices(services) {
  const results = {};
  await Promise.all(
    services
      .filter(s => s.healthPath && s.port)
      .map(async (s) => {
        results[s.id] = await checkHealth(s.port, s.healthPath);
      })
  );
  return results;
}

module.exports = { checkHealth, checkAllServices };
