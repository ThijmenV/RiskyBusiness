const test=require('node:test');const assert=require('node:assert/strict');
const bcrypt=require('bcryptjs');
const {hashPassword,verifyPassword}=require('../src/security/passwords');
test('both new PBKDF2 accounts and legacy bcrypt accounts remain usable',async()=>{
  for(const hash of [await hashPassword('compatibility123'),await bcrypt.hash('compatibility123',4)]) {
    assert.equal(await verifyPassword('compatibility123',hash),true);
    assert.equal(await verifyPassword('incorrect',hash),false);
  }
  assert.equal(await verifyPassword('x','broken'),false);
});
