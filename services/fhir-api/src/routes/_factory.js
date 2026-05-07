const express = require('express');
const { createController } = require('../controllers/fhirController');

/**
 * Creates a standard FHIR CRUD router for a given resource type.
 */
function createFhirRouter(resourceType, mockData) {
  const router = express.Router();
  const ctrl = createController(resourceType, mockData);

  router.get('/', ctrl.list);
  router.get('/:id', ctrl.getById);
  router.post('/', ctrl.create);
  router.put('/:id', ctrl.update);
  router.delete('/:id', ctrl.remove);

  return router;
}

module.exports = { createFhirRouter };
