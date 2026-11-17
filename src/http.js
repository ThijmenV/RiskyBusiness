const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
function text(value, name, max=120) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400,`Invalid ${name}`);
  return value.trim();
}
module.exports = { asyncRoute,fail,text };
