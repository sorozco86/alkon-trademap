const { getStore } = require('@netlify/blobs');
const DEFAULT = [{username:'admin', password:'alkon2026', role:'admin', active:true}];
exports.handler = async (event) => {
  const headers={'Content-Type':'application/json'};
  const store=getStore('trademap');
  let users = await store.get('users',{type:'json'}).catch(()=>null) || DEFAULT;
  if(event.httpMethod==='GET') return {statusCode:200,headers,body:JSON.stringify(users.map(({password,...u})=>u))};
  const body=JSON.parse(event.body||'{}');
  if(body.action==='login'){
    const u=users.find(x=>x.active!==false && x.username===body.username && x.password===body.password);
    if(!u) return {statusCode:401,headers,body:JSON.stringify({error:'invalid'})};
    return {statusCode:200,headers,body:JSON.stringify({username:u.username,role:u.role})};
  }
  if(body.action==='add'){
    if(!body.username||!body.password) return {statusCode:400,headers,body:JSON.stringify({error:'missing'})};
    users=users.filter(u=>u.username!==body.username);
    users.push({username:body.username,password:body.password,role:body.role||'vendedor',active:true});
    await store.setJSON('users',users);
    return {statusCode:200,headers,body:JSON.stringify({ok:true})};
  }
  return {statusCode:400,headers,body:JSON.stringify({error:'bad action'})};
};
