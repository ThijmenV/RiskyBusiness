const path = require('node:path');
const rootDirectory = process.env.LAMBDA_TASK_ROOT || path.join(__dirname, '..');
const production = process.env.NODE_ENV === 'production' || (process.env.NETLIFY === 'true' && process.env.CONTEXT !== 'dev');
function validateProductionConfig() {
  if (!production) return;
  if (!process.env.DATABASE_URL) throw new Error('Production requires DATABASE_URL; local JSON is not durable on free hosting.');
  const database=new URL(process.env.DATABASE_URL);
  const sslmode=database.searchParams.get('sslmode');
  if(!['localhost','127.0.0.1','[::1]'].includes(database.hostname) && !['require','verify-ca','verify-full'].includes(sslmode)) throw new Error('Production requires a database URL with verified TLS');
  if(process.env.NODE_TLS_REJECT_UNAUTHORIZED==='0') throw new Error('TLS verification cannot be disabled');
  if (['disable','no-verify'].includes(sslmode)) throw new Error('Production database TLS verification must stay enabled');
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('Production requires SESSION_SECRET of at least 32 characters.');
}
module.exports = {
  rootDirectory, production, validateProductionConfig,
  port: process.env.PORT || 3000,
  databasePath: process.env.DB_PATH || path.join(rootDirectory, 'data', 'app.json'),
  databaseUrl: process.env.DATABASE_URL,
  sessionSecret: process.env.SESSION_SECRET || 'local-development-only-change-in-production'
};
