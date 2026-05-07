/**
 * Pagination middleware — supports three modes:
 *   offset — classic page/limit with pagination metadata in body
 *   cursor — cursor-based with next/previous cursors
 *   link   — Link header (RFC 5988) with rel="next", rel="prev", etc.
 *
 * Mode is set globally via PAGINATION_MODE env var.
 * Attaches req.pagination with parsed params.
 */

function paginationMiddleware(req, res, next) {
  const mode = (process.env.PAGINATION_MODE || 'offset').toLowerCase();
  const defaultSize = parseInt(process.env.DEFAULT_PAGE_SIZE || '10', 10);
  const maxSize = parseInt(process.env.MAX_PAGE_SIZE || '100', 10);

  switch (mode) {
    case 'cursor':
      req.pagination = parseCursorParams(req, defaultSize, maxSize);
      break;
    case 'link':
      req.pagination = parseLinkParams(req, defaultSize, maxSize);
      break;
    case 'offset':
    default:
      req.pagination = parseOffsetParams(req, defaultSize, maxSize);
      break;
  }

  req.pagination.mode = mode;
  next();
}

function parseOffsetParams(req, defaultSize, maxSize) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(maxSize, Math.max(1, parseInt(req.query.limit || String(defaultSize), 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function parseCursorParams(req, defaultSize, maxSize) {
  const limit = Math.min(maxSize, Math.max(1, parseInt(req.query.limit || String(defaultSize), 10)));
  const after = req.query.after || null;   // cursor for next page
  const before = req.query.before || null; // cursor for previous page
  return { limit, after, before };
}

function parseLinkParams(req, defaultSize, maxSize) {
  const page = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit = Math.min(maxSize, Math.max(1, parseInt(req.query.limit || String(defaultSize), 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Build pagination response based on mode.
 */
function buildPaginationResponse(req, res, { data, total }) {
  const mode = req.pagination.mode;

  switch (mode) {
    case 'cursor':
      return buildCursorResponse(req, res, { data, total });
    case 'link':
      return buildLinkResponse(req, res, { data, total });
    case 'offset':
    default:
      return buildOffsetResponse(req, res, { data, total });
  }
}

function buildOffsetResponse(req, res, { data, total }) {
  const { page, limit } = req.pagination;
  const totalPages = Math.ceil(total / limit);
  return res.json({
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}

function buildCursorResponse(req, res, { data, total }) {
  const { limit } = req.pagination;
  const hasMore = data.length === limit;

  const nextCursor = hasMore && data.length > 0
    ? Buffer.from(String(data[data.length - 1].id)).toString('base64')
    : null;

  const prevCursor = req.pagination.after
    ? Buffer.from(String(data[0]?.id || '')).toString('base64')
    : null;

  return res.json({
    data,
    pagination: {
      total,
      limit,
      next_cursor: nextCursor,
      previous_cursor: prevCursor,
      has_more: hasMore
    }
  });
}

function buildLinkResponse(req, res, { data, total }) {
  const { page, limit } = req.pagination;
  const totalPages = Math.ceil(total / limit);
  const baseUrl = `${req.protocol}://${req.get('host')}${req.baseUrl}${req.path}`;

  const links = [];
  if (page < totalPages) {
    links.push(`<${baseUrl}?page=${page + 1}&limit=${limit}>; rel="next"`);
  }
  if (page > 1) {
    links.push(`<${baseUrl}?page=${page - 1}&limit=${limit}>; rel="prev"`);
  }
  links.push(`<${baseUrl}?page=1&limit=${limit}>; rel="first"`);
  links.push(`<${baseUrl}?page=${totalPages}&limit=${limit}>; rel="last"`);

  if (links.length > 0) {
    res.set('Link', links.join(', '));
  }

  return res.json({
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages
    }
  });
}

/**
 * Build cursor-based SQL query helpers.
 */
function buildCursorQuery(tableName, pagination, orderCol = 'id') {
  const { limit, after, before } = pagination;
  let query = `SELECT * FROM ${tableName}`;
  const params = [];
  let paramIdx = 1;

  if (after) {
    const decodedId = parseInt(Buffer.from(after, 'base64').toString('utf-8'), 10);
    query += ` WHERE ${orderCol} > $${paramIdx}`;
    params.push(decodedId);
    paramIdx++;
  } else if (before) {
    const decodedId = parseInt(Buffer.from(before, 'base64').toString('utf-8'), 10);
    query += ` WHERE ${orderCol} < $${paramIdx}`;
    params.push(decodedId);
    paramIdx++;
  }

  query += ` ORDER BY ${orderCol} ASC LIMIT $${paramIdx}`;
  params.push(limit);

  return { query, params };
}

module.exports = {
  paginationMiddleware,
  buildPaginationResponse,
  buildCursorQuery
};
