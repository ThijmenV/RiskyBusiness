const crypto = require('node:crypto');
const { promisify } = require('node:util');
const bcrypt = require('bcryptjs');
const pbkdf2 = promisify(crypto.pbkdf2);
async function hashPassword(password) {
  const salt=crypto.randomBytes(16).toString('hex');
  const hash=await pbkdf2(password,salt,310000,32,'sha256');
  return `${salt}:${hash.toString('hex')}`;
}
async function verifyPassword(password, stored) {
  if(typeof stored!=='string') return false;
  if(/^\$2[aby]\$/.test(stored)) return bcrypt.compare(password,stored);
  const [salt,hash]=stored.split(':');
  if(!salt || !/^[0-9a-f]{64}$/i.test(hash || '')) return false;
  const actual=await pbkdf2(password,salt,310000,32,'sha256');
  return crypto.timingSafeEqual(Buffer.from(hash,'hex'),actual);
}
module.exports={hashPassword,verifyPassword};
