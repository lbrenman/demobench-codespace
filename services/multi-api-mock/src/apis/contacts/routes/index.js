const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { paginationMiddleware } = require('../../../middleware/pagination');
const controller = require('../controllers/index');
const router = express.Router();

// Health check for this specific API
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    api: 'Contacts API',
    timestamp: new Date().toISOString()
  });
});

// List contacts (paginated)
router.get('/', paginationMiddleware, controller.list);

// Get contact by ID
router.get('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
], controller.getById);

// Create contact
router.post('/', [
  body('first_name').notEmpty().trim().withMessage('first_name is required'),
  body('last_name').notEmpty().trim().withMessage('last_name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('company').optional().trim(),
  body('title').optional().trim()
], controller.create);

// Update contact
router.put('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer'),
  body('email').optional().isEmail().withMessage('Must be a valid email')
], controller.update);

// Delete contact
router.delete('/:id', [
  param('id').isInt({ min: 1 }).withMessage('ID must be a positive integer')
], controller.remove);

module.exports = router;
