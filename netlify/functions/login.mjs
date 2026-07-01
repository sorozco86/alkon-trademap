import { users, sign, json } from './_auth.mjs';
export async function handler(event){
  if(event.httpMethod !== 'POST') return json(405,{error:'Método no permitido'});
  try{
    const { userId, pin } = JSON.parse(event.body || '{}');
    const user = users().find(u => u.id === userId && u.pin === pin);
    if(!user) return json(401,{error:'Usuario o PIN incorrecto'});
    const safeUser = {id:user.id, name:user.name, role:user.role, region:user.region};
    return json(200,{token: sign(safeUser), user:safeUser});
  }catch(e){ return json(400,{error:e.message}); }
}
