const {createStorage}=require('../src/storage');
async function migrateDatabase(databaseUrl=process.env.DATABASE_URL) {
  if(!databaseUrl) throw new Error('DATABASE_URL is required');
  const storage=createStorage({databaseUrl,schemaMode:'migrate'});
  try{await storage.ensureReady();return require('../src/storage/schema').SCHEMA_VERSION;}
  finally{await storage.close();}
}
if(require.main===module) migrateDatabase().then(version=>console.log('Database schema ready:',version)).catch(error=>{console.error('Migration failed:',error.code || error.message);process.exitCode=1;});
module.exports={migrateDatabase};
