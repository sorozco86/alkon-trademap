import { getStore } from '@netlify/blobs';
import { verify, json } from './_auth.mjs';
const store = getStore('alkon-trademap');
async function allVisits(){ return JSON.parse((await store.get('visits.json')) || '[]'); }
async function saveVisits(v){ await store.set('visits.json', JSON.stringify(v)); }
export async function handler(event){
  let me; try{ me = verify(event.headers.authorization || ''); }catch(e){ return json(401,{error:e.message}); }
  if(event.httpMethod === 'GET'){
    const visits = await allVisits();
    const filtered = me.role === 'vendedor' ? visits.filter(v=>v.userId===me.id) : visits;
    return json(200,{visits: filtered});
  }
  if(event.httpMethod === 'POST'){
    try{
      const body = JSON.parse(event.body || '{}');
      const now = new Date().toISOString();
      const visit = {
        id: body.id || `${body.companyId}-${me.id}-${Date.now()}`,
        companyId: Number(body.companyId),
        status: body.status || 'Visitado con foto',
        note: body.note || '',
        contactName: body.contactName || '',
        nextAction: body.nextAction || '',
        lat: body.lat ?? null,
        lng: body.lng ?? null,
        accuracy: body.accuracy ?? null,
        photoKey: body.photoKey || '',
        photoUrl: body.photoUrl || '',
        userId: me.id,
        userName: me.name,
        role: me.role,
        region: me.region,
        createdAt: now,
        updatedAt: now
      };
      const visits = await allVisits();
      visits.push(visit);
      await saveVisits(visits);
      return json(200,{visit});
    }catch(e){ return json(400,{error:e.message}); }
  }
  return json(405,{error:'Método no permitido'});
}
