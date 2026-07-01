import { users, verify, json } from './_auth.mjs';
export async function handler(event){
  try{
    const me = verify(event.headers.authorization || '');
    const list = users().map(({pin, ...u})=>u);
    return json(200,{me, users: me.role === 'vendedor' ? list.filter(u=>u.id===me.id) : list});
  }catch(e){ return json(401,{error:e.message}); }
}
