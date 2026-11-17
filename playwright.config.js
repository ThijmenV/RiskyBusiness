const {defineConfig}=require('@playwright/test');
const path=require('node:path');
module.exports=defineConfig({
  testDir:'./e2e',fullyParallel:false,workers:1,
  use:{baseURL:'http://127.0.0.1:3100',headless:true,launchOptions:process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}},
  webServer:{command:'node server.js',url:'http://127.0.0.1:3100/api/health',reuseExistingServer:false,env:{PORT:'3100',DATABASE_URL:'',NODE_ENV:'test',DB_PATH:path.join(require('node:os').tmpdir(),`risky-e2e-${process.pid}.json`)}},
});
