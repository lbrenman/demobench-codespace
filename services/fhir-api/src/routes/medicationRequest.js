const { createFhirRouter } = require('./_factory');
const data = require('../data/MedicationRequest.json');
module.exports = createFhirRouter('MedicationRequest', data);
