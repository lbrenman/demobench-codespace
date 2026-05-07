const { validationResult } = require('express-validator');
const pool = require('../../../db/client');
const { buildPaginationResponse, buildCursorQuery } = require('../../../middleware/pagination');

const TABLE = 'orders';

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
        `SELECT o.*, c.first_name || ' ' || c.last_name as contact_name, c.email as contact_email
         FROM ${TABLE} o
         LEFT JOIN contacts c ON o.contact_id = c.id
         ORDER BY o.id ASC LIMIT $1 OFFSET $2`,
        [limit, offset]
      );
      rows = result.rows;
    }

    return buildPaginationResponse(req, res, { data: rows, total });
  } catch (err) {
    console.error('Orders list error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

exports.getById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const result = await pool.query(
      `SELECT o.*, c.first_name || ' ' || c.last_name as contact_name, c.email as contact_email
       FROM ${TABLE} o
       LEFT JOIN contacts c ON o.contact_id = c.id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    // Also fetch items
    const items = await pool.query(
      `SELECT oi.*, p.name as product_name, p.sku as product_sku
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [req.params.id]
    );

    const order = result.rows[0];
    order.items = items.rows;

    res.json({ data: order });
  } catch (err) {
    console.error('Order getById error:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

exports.getItems = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    // Check order exists
    const order = await pool.query(`SELECT id FROM ${TABLE} WHERE id = $1`, [req.params.id]);
    if (order.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const items = await pool.query(
      `SELECT oi.*, p.name as product_name, p.sku as product_sku
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1
       ORDER BY oi.id`,
      [req.params.id]
    );

    res.json({ data: items.rows });
  } catch (err) {
    console.error('Order items error:', err);
    res.status(500).json({ error: 'Failed to fetch order items' });
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { contact_id, items, shipping_address, billing_address, notes } = req.body;

    // Verify contact exists
    const contact = await client.query('SELECT id FROM contacts WHERE id = $1', [contact_id]);
    if (contact.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Contact with id ${contact_id} not found` });
    }

    // Look up product prices and calculate totals
    let subtotal = 0;
    const resolvedItems = [];

    for (const item of items) {
      const product = await client.query('SELECT id, price FROM products WHERE id = $1', [item.product_id]);
      if (product.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Product with id ${item.product_id} not found` });
      }
      const unitPrice = parseFloat(product.rows[0].price);
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      resolvedItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        total_price: totalPrice
      });
    }

    const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
    const shipping = subtotal > 500 ? 0 : 15.00;
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const orderResult = await client.query(
      `INSERT INTO ${TABLE} (order_number, contact_id, status, subtotal, tax, shipping, total, shipping_address, billing_address, notes)
       VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [orderNumber, contact_id, subtotal, tax, shipping, total, shipping_address || null, billing_address || null, notes || null]
    );

    const order = orderResult.rows[0];

    // Insert order items
    for (const item of resolvedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.product_id, item.quantity, item.unit_price, item.total_price]
      );
    }

    await client.query('COMMIT');

    // Fetch the complete order with items
    const fullOrder = await pool.query(
      `SELECT o.*, c.first_name || ' ' || c.last_name as contact_name
       FROM ${TABLE} o LEFT JOIN contacts c ON o.contact_id = c.id WHERE o.id = $1`,
      [order.id]
    );
    const orderItems = await pool.query(
      `SELECT oi.*, p.name as product_name FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = $1`,
      [order.id]
    );

    const responseOrder = fullOrder.rows[0];
    responseOrder.items = orderItems.rows;

    res.status(201).json({ data: responseOrder });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order create error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
};

exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const existing = await pool.query(`SELECT * FROM ${TABLE} WHERE id = $1`, [req.params.id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const current = existing.rows[0];
    const status = req.body.status || current.status;
    const notes = req.body.notes !== undefined ? req.body.notes : current.notes;
    const shipping_address = req.body.shipping_address !== undefined ? req.body.shipping_address : current.shipping_address;
    const billing_address = req.body.billing_address !== undefined ? req.body.billing_address : current.billing_address;

    let shipped_at = current.shipped_at;
    let delivered_at = current.delivered_at;
    if (status === 'shipped' && !shipped_at) shipped_at = new Date().toISOString();
    if (status === 'delivered' && !delivered_at) delivered_at = new Date().toISOString();

    const result = await pool.query(
      `UPDATE ${TABLE} SET status=$1, notes=$2, shipping_address=$3, billing_address=$4,
       shipped_at=$5, delivered_at=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [status, notes, shipping_address, billing_address, shipped_at, delivered_at, req.params.id]
    );

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error('Order update error:', err);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

exports.remove = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const result = await pool.query(`DELETE FROM ${TABLE} WHERE id = $1 RETURNING *`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found' });
    res.json({ data: result.rows[0], message: 'Order deleted' });
  } catch (err) {
    console.error('Order delete error:', err);
    res.status(500).json({ error: 'Failed to delete order' });
  }
};
