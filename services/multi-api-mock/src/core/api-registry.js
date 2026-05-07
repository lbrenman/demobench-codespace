/**
 * API Registry — maintains metadata about all loaded API plugins.
 * Used by health checks, admin portal, and OpenAPI doc aggregation.
 */

const registry = new Map();
const requestLog = [];
const MAX_LOG_SIZE = 5000;

function registerApi(name, config) {
  registry.set(name, {
    name,
    basePath: config.basePath,
    description: config.description || '',
    version: config.version || '1.0.0',
    resource: config.resource,
    registeredAt: new Date().toISOString(),
    requestCount: 0,
    errorCount: 0,
    lastRequest: null,
    status: 'healthy'
  });
}

function getRegistry() {
  return registry;
}

function getApiInfo(name) {
  return registry.get(name);
}

function recordRequest(apiName, { method, path, statusCode, duration }) {
  const api = registry.get(apiName);
  if (api) {
    api.requestCount++;
    api.lastRequest = new Date().toISOString();
    if (statusCode >= 400) {
      api.errorCount++;
    }
  }

  const entry = {
    timestamp: new Date().toISOString(),
    api: apiName,
    method,
    path,
    statusCode,
    duration
  };

  requestLog.push(entry);
  if (requestLog.length > MAX_LOG_SIZE) {
    requestLog.shift();
  }
}

function getRequestLog(apiName) {
  if (apiName) {
    return requestLog.filter(e => e.api === apiName);
  }
  return requestLog;
}

module.exports = { registerApi, getRegistry, getApiInfo, recordRequest, getRequestLog };
