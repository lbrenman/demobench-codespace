require('dotenv').config();
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 Multi-API Mock Server running on port ${PORT}`);
  console.log(`   Admin Portal: http://localhost:${PORT}/admin`);
  console.log(`   API Docs:     http://localhost:${PORT}/api-docs`);
  console.log(`   Health:       http://localhost:${PORT}/health`);
  console.log(`   Auth Mode:    ${process.env.AUTH_MODE || 'apikey'}`);
  console.log(`   Pagination:   ${process.env.PAGINATION_MODE || 'offset'}\n`);
});
