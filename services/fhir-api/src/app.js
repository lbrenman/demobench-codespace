require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authMiddleware = require('./middleware/auth');
const paginationMiddleware = require('./middleware/pagination');

const healthRouter = require('./routes/health');
const apiDocsRouter = require('./routes/apidocs');

// FHIR resource routers
const patientRouter = require('./routes/patient');
const observationRouter = require('./routes/observation');
const conditionRouter = require('./routes/condition');
const encounterRouter = require('./routes/encounter');
const medicationRouter = require('./routes/medication');
const medicationRequestRouter = require('./routes/medicationRequest');
const practitionerRouter = require('./routes/practitioner');
const organizationRouter = require('./routes/organization');
const allergyIntoleranceRouter = require('./routes/allergyIntolerance');
const procedureRouter = require('./routes/procedure');
const diagnosticReportRouter = require('./routes/diagnosticReport');
const appointmentRouter = require('./routes/appointment');
const immunizationRouter = require('./routes/immunization');
const careplanRouter = require('./routes/carePlan');
const locationRouter = require('./routes/location');

const app = express();

app.set('trust proxy', 1);

// Security & parsing
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

// Public routes (no auth)
app.use('/health', healthRouter);
app.use('/api-docs', apiDocsRouter);

// Auth + pagination middleware for all FHIR resource routes
app.use(authMiddleware);
app.use(paginationMiddleware);

// FHIR R4 resource routes
app.use('/Patient', patientRouter);
app.use('/Observation', observationRouter);
app.use('/Condition', conditionRouter);
app.use('/Encounter', encounterRouter);
app.use('/Medication', medicationRouter);
app.use('/MedicationRequest', medicationRequestRouter);
app.use('/Practitioner', practitionerRouter);
app.use('/Organization', organizationRouter);
app.use('/AllergyIntolerance', allergyIntoleranceRouter);
app.use('/Procedure', procedureRouter);
app.use('/DiagnosticReport', diagnosticReportRouter);
app.use('/Appointment', appointmentRouter);
app.use('/Immunization', immunizationRouter);
app.use('/CarePlan', careplanRouter);
app.use('/Location', locationRouter);

// 404 for unknown paths
app.use((req, res) => {
  res.status(404).json({ error: `Path not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
