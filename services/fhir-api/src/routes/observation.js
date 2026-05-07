const { createFhirRouter } = require('./_factory');
const data = require('../data/Observation.json');
module.exports = createFhirRouter('Observation', data);
