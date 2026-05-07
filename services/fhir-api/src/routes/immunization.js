const { createFhirRouter } = require('./_factory');
const data = require('../data/Immunization.json');
module.exports = createFhirRouter('Immunization', data);
