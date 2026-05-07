const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const router = express.Router();
const spec = YAML.load(path.join(__dirname, '../../openapi.yaml'));

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(spec, {
  customSiteTitle: 'FHIR R4 API - Axway Amplify',
  customCss: '.swagger-ui .topbar { background-color: #0066cc; }'
}));

module.exports = router;
