const { createFhirRouter } = require('./_factory');
const data = require('../data/Encounter.json');
module.exports = createFhirRouter('Encounter', data);
