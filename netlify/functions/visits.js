const { getStore } = require('@netlify/blobs');
exports.handler = async (event) => {
  const headers={'Content-Type':'application/json'};
  const store=getStore('trademap');
  let visits = await store.get('visits',{type:'json'}).catch(()=>null) || [];
  if(event.httpMethod==='GET') return {statusCode:200,headers,body:JSON.stringify(visits)};
  if(event.httpMethod==='POST'){
    const visit=JSON.parse(event.body||'{}');
    visit.id = visit.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    visits.push(visit);
    await store.setJSON('visits',visits);
    return {statusCode:200,headers,body:JSON.stringify({ok:true,id:visit.id})};
  }
  return {statusCode:405,headers,body:JSON.stringify({error:'method not allowed'})};
};
