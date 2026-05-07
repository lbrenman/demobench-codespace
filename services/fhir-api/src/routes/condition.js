const { createFhirRouter } = require('./_factory');
const data = require('../data/Condition.json');
module.exports = createFhirRouter('Condition', data);
