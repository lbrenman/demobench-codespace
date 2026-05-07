const { createFhirRouter } = require('./_factory');
const data = require('../data/CarePlan.json');
module.exports = createFhirRouter('CarePlan', data);
