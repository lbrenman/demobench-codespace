const { validationResult } = require('express-validator');
const pool = require('../../../db/client');
const { buildPaginationResponse, buildCursorQuery } = require('../../../middleware/pagination');

const TABLE = 'products';

exports.list = async (req, res) => {
  try {
    const countResult = await pool.query(`SELECT COUNT(*) FROM ${TABLE}`);
    const total = parseInt(countResult.rows[0].count, 10);

    let rows;
    if (req.pagination.mode === 'cursor') {
      const { query, params } = buildCursorQuery(TABLE, req.pagination);
      const result = await pool.query(query, params);
      rows = result.rows;
    } else {
      const { limit, offset } = req.pagination;
      const result = await pool.query(
        `SELECT * FROM ${TABLE} ORDER BY id ASC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      rows = result.rows;
    }

    return buildPaginationResponse(req, res, { data: rows, total });
  } catch (err) {
    console.error('Products list error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

exports.getById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Product getById error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, sku, description, category, price, currency, stock_quantity, weight_kg, is_active, image_url } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO ${TABLE} (name, sku, description, category, price, currency, stock_quantity, weight_kg, is_active, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, sku, description || null, category || null, price, currency || 'USD',
       stock_quantity || 0, weight_kg || null, is_active !== false, image_url || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A product with this SKU already exists' });
    console.error('Product create error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const existing = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const fields = ['name', 'sku', 'description', 'category', 'price', 'currency', 'stock_quantity', 'weight_kg', 'is_active', 'image_url'];
    const current = existing.rows[0];
    const updates = {};
    for (const f of fields) {
      updates[f] = req.body[f] !== undefined ? req.body[f] : current[f];
    }

    const result = await pool.query(
      `UPDATE ${TABLE} SET name=$1, sku=$2, description=$3, category=$4, price=$5, currency=$6,
       stock_quantity=$7, weight_kg=$8, is_active=$9, image_url=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [updates.name, updates.sku, updates.description, updates.category, updates.price, updates.currency,
       updates.stock_quantity, updates.weight_kg, updates.is_active, updates.image_url, req.params.id]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A product with this SKU already exists' });
    console.error('Product update error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

exports.remove = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const result = await pool.query(`DELETE FROM ${TABLE} WHERE id = $1 RETURNING *`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ data: result.rows[0], message: 'Product deleted' });
  } catch (err) {
    console.error('Product delete error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};
