const { createFhirRouter } = require('./_factory');
const data = require('../data/Organization.json');
module.exports = createFhirRouter('Organization', data);
