const express = require('express');
const { body, param } = require('express-validator');
const { paginationMiddleware } = require('../../../middleware/pagination');
const controller = require('../controllers/index');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', api: 'Orders API', timestamp: new Date().toISOString() });
});

router.get('/', paginationMiddleware, controller.list);

router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
], controller.getById);

// Get order items for an order
router.get('/:id/items', [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
], controller.getItems);

router.post('/', [
  body('contact_id').isInt({ min: 1 }).withMessage('contact_id is required and must be a positive integer'),
  body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('Each item needs a valid product_id'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Each item needs a quantity >= 1'),
  body('shipping_address').optional().trim(),
  body('billing_address').optional().trim(),
  body('notes').optional().trim()
], controller.create);

router.put('/:id', [
  param('id').isInt({ min: 1 }),
  body('status').optional().isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled')
], controller.update);

router.delete('/:id', [
  param('id').isInt({ min: 1 })
], controller.remove);

module.exports = router;
