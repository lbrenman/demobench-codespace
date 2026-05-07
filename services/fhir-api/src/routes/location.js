const { createFhirRouter } = require('./_factory');
const data = require('../data/Location.json');
module.exports = createFhirRouter('Location', data);
