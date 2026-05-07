const { createFhirRouter } = require('./_factory');
const data = require('../data/AllergyIntolerance.json');
module.exports = createFhirRouter('AllergyIntolerance', data);
