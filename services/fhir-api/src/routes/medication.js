const { createFhirRouter } = require('./_factory');
const data = require('../data/Medication.json');
module.exports = createFhirRouter('Medication', data);
