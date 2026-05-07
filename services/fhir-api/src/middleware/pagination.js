module.exports = function paginationMiddleware(req, res, next) {
  const defaultSize = parseInt(process.env.DEFAULT_PAGE_SIZE) || 10;
  const maxSize = parseInt(process.env.MAX_PAGE_SIZE) || 100;

  let page = parseInt(req.query.page) || 1;
  let limit = parseInt(req.query.count) || parseInt(req.query.limit) || defaultSize;

  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > maxSize) limit = maxSize;

  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit
  };
  next();
};

function buildPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
}

module.exports.buildPaginationMeta = buildPaginationMeta;
