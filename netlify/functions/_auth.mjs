import crypto from 'crypto';

const DEFAULT_USERS = [
  { id:'admin', name:'Sebastián Orozco', role:'admin', region:'Nacional', pin:'admin123' },
  { id:'sup-centro', name:'Supervisor Centro', role:'supervisor', region:'Centro', pin:'centro123' },
  { id:'vend-amba', name:'Vendedor AMBA', role:'vendedor', region:'AMBA', pin:'amba123' },
  { id:'vend-cba', name:'Vendedor Córdoba', role:'vendedor', region:'Córdoba', pin:'cba123' }
];

export function users(){
  try { return JSON.parse(process.env.USERS_JSON || ''); } catch { return DEFAULT_USERS; }
}
export function secret(){ return process.env.JWT_SECRET || 'cambiar-este-secreto-en-netlify'; }
export function sign(payload){
  const body = Buffer.from(JSON.stringify({...payload, exp: Date.now()+1000*60*60*12})).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
export function verify(authHeader=''){
  const token = authHeader.replace(/^Bearer\s+/i,'');
  if(!token) throw new Error('Sin token');
  const [body,sig] = token.split('.');
  const ok = crypto.createHmac('sha256', secret()).update(body).digest('base64url') === sig;
  if(!ok) throw new Error('Token inválido');
  const payload = JSON.parse(Buffer.from(body,'base64url').toString());
  if(payload.exp < Date.now()) throw new Error('Sesión vencida');
  return payload;
}
export function json(statusCode, data){
  return { statusCode, headers:{'content-type':'application/json; charset=utf-8'}, body: JSON.stringify(data) };
}
