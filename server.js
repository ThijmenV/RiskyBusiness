const {createApp}=require('./src/app');
const storage=require('./src/storage');
const {port}=require('./src/config');
const app=createApp();
if(require.main===module) {
  storage.ensureReady().then(()=>{
    const server=app.listen(port,'0.0.0.0',()=>console.log(`Risky Business listening on port ${port}`));
    server.on('error',error=>{
      console.error(error.code==='EADDRINUSE'?`Port ${port} is in use; choose another PORT.`:'Server failed: '+error.code);
      process.exitCode=1;
    });
    async function stop() {
      server.close(async()=>{app.locals.sessionStore?.close();await storage.close();process.exit(0);});
      setTimeout(()=>process.exit(1),10000).unref();
    }
    process.once('SIGTERM',stop);process.once('SIGINT',stop);
  }).catch(error=>{
    console.error('Storage initialization failed:',error.code || error.name);
    process.exitCode=1;
  });
}
module.exports={app};
