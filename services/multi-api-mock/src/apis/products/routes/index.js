const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { paginationMiddleware } = require('../../../middleware/pagination');
const controller = require('../controllers/index');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', api: 'Products API', timestamp: new Date().toISOString() });
});

router.get('/', paginationMiddleware, controller.list);

router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
], controller.getById);

router.post('/', [
  body('name').notEmpty().trim().withMessage('name is required'),
  body('sku').notEmpty().trim().withMessage('sku is required'),
  body('price').isFloat({ min: 0 }).withMessage('price must be a positive number'),
  body('category').optional().trim(),
  body('stock_quantity').optional().isInt({ min: 0 })
], controller.create);

router.put('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  body('price').optional().isFloat({ min: 0 }),
  body('stock_quantity').optional().isInt({ min: 0 })
], controller.update);

router.delete('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
], controller.remove);

module.exports = router;
