import { getStore } from '@netlify/blobs';
import { verify, json } from './_auth.mjs';
const store = getStore('alkon-trademap-photos');
export async function handler(event){
  let me; try{ me = verify(event.headers.authorization || ''); }catch(e){ return json(401,{error:e.message}); }
  if(event.httpMethod !== 'POST') return json(405,{error:'Método no permitido'});
  try{
    const { companyId, dataUrl } = JSON.parse(event.body || '{}');
    if(!companyId || !dataUrl?.startsWith('data:image/')) return json(400,{error:'Foto inválida'});
    const key = `visit-${companyId}-${me.id}-${Date.now()}.jpg`;
    await store.set(key, dataUrl, { metadata:{ companyId, userId:me.id, createdAt:new Date().toISOString() }});
    return json(200,{photoKey:key, photoUrl:`/.netlify/functions/photo-view?key=${encodeURIComponent(key)}`});
  }catch(e){ return json(400,{error:e.message}); }
}
