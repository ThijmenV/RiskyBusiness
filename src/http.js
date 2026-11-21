const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
function text(value, name, max=120) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400,`Invalid ${name}`);
  return value.trim();
}
function requireGameVersion(req) {
  // Use a CDN-safe application header. Keep If-Match for existing API clients.
  const raw=req.get('X-Game-Version') ?? req.get('If-Match');
  const normalized=typeof raw==='string'?raw.replace(/^"(\d+)"$/,'$1'):'';
  const version=Number(normalized);
  if(!/^\d+$/.test(normalized) || !Number.isSafeInteger(version)) fail(428,'A current game version is required (X-Game-Version)');
  return version;
}
module.exports = { asyncRoute,fail,text,requireGameVersion };
