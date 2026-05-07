const { createFhirRouter } = require('./_factory');
const data = require('../data/Patient.json');
module.exports = createFhirRouter('Patient', data);
