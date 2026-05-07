const { createFhirRouter } = require('./_factory');
const data = require('../data/DiagnosticReport.json');
module.exports = createFhirRouter('DiagnosticReport', data);
