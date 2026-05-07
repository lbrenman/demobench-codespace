const { createFhirRouter } = require('./_factory');
const data = require('../data/Practitioner.json');
module.exports = createFhirRouter('Practitioner', data);
