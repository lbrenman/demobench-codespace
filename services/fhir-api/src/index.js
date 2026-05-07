require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`FHIR R4 API running on port ${PORT}`);
  console.log(`  Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`  Health:     http://localhost:${PORT}/health`);
  console.log(`  Auth mode:  ${process.env.AUTH_MODE || 'apikey'}`);
  console.log(`  Data mode:  ${process.env.DATA_MODE || 'mock'}`);
});
