const { validationResult } = require('express-validator');
const pool = require('../../../db/client');
const { buildPaginationResponse, buildCursorQuery } = require('../../../middleware/pagination');

const TABLE = 'contacts';

exports.list = async (req, res) => {
  try {
    const mode = req.pagination.mode;

    // Get total count
    const countResult = await pool.query(`SELECT COUNT(*) FROM ${TABLE}`);
    const total = parseInt(countResult.rows[0].count, 10);

    let rows;
    if (mode === 'cursor') {
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
    console.error('Contacts list error:', err);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
};

exports.getById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Contact getById error:', err);
    res.status(500).json({ error: 'Failed to fetch contact' });
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { first_name, last_name, email, phone, company, title, address, city, state, zip, country, notes } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO ${TABLE} (first_name, last_name, email, phone, company, title, address, city, state, zip, country, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [first_name, last_name, email, phone || null, company || null, title || null, address || null, city || null, state || null, zip || null, country || 'US', notes || null]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A contact with this email already exists' });
    }
    console.error('Contact create error:', err);
    res.status(500).json({ error: 'Failed to create contact' });
  }
};

exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Check exists
    const existing = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    const fields = ['first_name', 'last_name', 'email', 'phone', 'company', 'title', 'address', 'city', 'state', 'zip', 'country', 'notes'];
    const current = existing.rows[0];
    const updates = {};

    for (const field of fields) {
      updates[field] = req.body[field] !== undefined ? req.body[field] : current[field];
    }

    const result = await pool.query(
      `UPDATE ${TABLE} SET first_name=$1, last_name=$2, email=$3, phone=$4, company=$5, title=$6,
       address=$7, city=$8, state=$9, zip=$10, country=$11, notes=$12, updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [updates.first_name, updates.last_name, updates.email, updates.phone, updates.company, updates.title,
       updates.address, updates.city, updates.state, updates.zip, updates.country, updates.notes, req.params.id]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A contact with this email already exists' });
    }
    console.error('Contact update error:', err);
    res.status(500).json({ error: 'Failed to update contact' });
  }
};

exports.remove = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const result = await pool.query(`DELETE FROM ${TABLE} WHERE id = $1 RETURNING *`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json({ data: result.rows[0], message: 'Contact deleted' });
  } catch (err) {
    console.error('Contact delete error:', err);
    res.status(500).json({ error: 'Failed to delete contact' });
  }
};
