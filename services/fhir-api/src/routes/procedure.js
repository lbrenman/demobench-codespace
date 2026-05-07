const { createFhirRouter } = require('./_factory');
const data = require('../data/Procedure.json');
module.exports = createFhirRouter('Procedure', data);
