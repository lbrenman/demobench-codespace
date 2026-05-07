const { createFhirRouter } = require('./_factory');
const data = require('../data/Appointment.json');
module.exports = createFhirRouter('Appointment', data);
