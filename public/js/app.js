let clients=[], visits=[], users=[], session=null, current=null, photoData=null;
let map, miniMap, markers=[], miniMarkers=[], heatLayer=null, heatOn=false;
const $=id=>document.getElementById(id);
const todayKey=()=>new Date().toISOString().slice(0,10);

async function api(path, options={}){
  const res = await fetch(path, options);
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}
async function init(){
  session = JSON.parse(localStorage.getItem('tm_session')||'null');
  wireLogin();
  if(session) showApp();
}
function wireLogin(){
  $('loginBtn').onclick=async()=>{
    $('loginMsg').textContent='Validando...';
    try{
      session=await api('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',username:$('loginUser').value.trim(),password:$('loginPass').value})});
      localStorage.setItem('tm_session',JSON.stringify(session)); showApp();
    }catch(e){$('loginMsg').textContent='Usuario o contraseña inválidos';}
  };
}
async function showApp(){
  $('login').classList.add('hidden'); $('app').classList.remove('hidden'); $('userBadge').textContent=`${session.username} · ${session.role}`;
  $('adminTab').style.display=session.role==='admin'?'inline-block':'none';
  await loadData(); wireApp(); setupMaps(); renderAll();
}
async function loadData(){
  const r = await fetch('/data/clients.json');
  if(!r.ok) throw new Error('No se encontró /data/clients.json');
  const data = await r.json();
  clients = Array.isArray(data) ? data.filter(c=>Number.isFinite(Number(c.lat))&&Number.isFinite(Number(c.lng))) : [];
  try{ visits=await api('/api/visits'); }catch(e){ visits=JSON.parse(localStorage.getItem('tm_visits')||'[]'); }
  try{ users=await api('/api/auth?action=list'); }catch(e){ users=[]; }
}
function wireApp(){
  document.querySelectorAll('nav button[data-view]').forEach(b=>b.onclick=()=>showView(b.dataset.view));
  $('logoutBtn').onclick=()=>{localStorage.removeItem('tm_session'); location.reload();};
  ['search','priority','status'].forEach(id=>$(id).addEventListener('input',renderClients));
  $('toggleHeat').onclick=()=>{heatOn=!heatOn; $('toggleHeat').classList.toggle('secondary',!heatOn); renderMap();};
  $('fitMap').onclick=fitMap;
  $('exportCsv').onclick=exportCsv;
  $('closeModal').onclick=()=>$('modal').classList.add('hidden');
  $('photo').onchange=async e=>{const f=e.target.files[0]; if(f){photoData=await compressImage(f); $('preview').src=photoData; $('preview').classList.remove('hidden');}};
  $('saveVisit').onclick=saveVisit;
  $('addUser').onclick=addUser;
}
function showView(id){document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden')); $(id).classList.remove('hidden'); document.querySelectorAll('nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id)); setTimeout(()=>{map?.invalidateSize(); miniMap?.invalidateSize();},100);}
function setupMaps(){
  if(map) return;
  map = L.map('map').setView([-34.6,-58.4],5); miniMap=L.map('miniMap').setView([-34.6,-58.4],5);
  const osm='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const base=L.tileLayer(osm,{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  const sat=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Tiles © Esri'});
  L.control.layers({Mapa:base,Satelital:sat}).addTo(map);
  L.tileLayer(osm,{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(miniMap);
  const legend=L.control({position:'bottomleft'}); legend.onAdd=()=>{const d=L.DomUtil.create('div','legend');d.innerHTML='<b>Estados</b><br><span class="dot" style="background:#ef4444"></span>Pendiente<br><span class="dot" style="background:#f59e0b"></span>Visitado sin foto<br><span class="dot" style="background:#16a34a"></span>Visitado con foto';return d}; legend.addTo(map);
}
function latestVisit(id){return [...visits].reverse().find(v=>String(v.clientId)===String(id));}
function colorFor(c){const v=latestVisit(c.id); return !v?'#ef4444':(v.photo?'#16a34a':'#f59e0b');}
function filtered(){const q=($('search')?.value||'').toLowerCase().trim(),p=$('priority')?.value||'',s=$('status')?.value||''; return clients.filter(c=>{const v=latestVisit(c.id); const txt=`${c.empresa} ${c.provincia} ${c.ciudad} ${c.tipo} ${c.rubro}`.toLowerCase(); if(q&&!txt.includes(q))return false; if(p&&c.prioridad!==p)return false; if(s==='pending'&&v)return false; if(s==='visited'&&!v)return false; if(s==='photo'&&!(v&&v.photo))return false; return true;});}
function renderAll(){renderKpis(); renderProvince(); renderMap(); renderMiniMap(); renderClients(); renderUsers();}
function renderKpis(){const ids=new Set(visits.map(v=>String(v.clientId))); $('kTotal').textContent=clients.length; $('kVisited').textContent=ids.size; $('kPending').textContent=clients.length-ids.size; $('kCoverage').textContent=clients.length?Math.round(ids.size/clients.length*100)+'%':'0%'; $('kToday').textContent=visits.filter(v=>(v.createdAt||'').startsWith(todayKey())).length;}
function renderProvince(){const by={}; clients.forEach(c=>{by[c.provincia]=by[c.provincia]||{t:0,v:0}; by[c.provincia].t++; if(latestVisit(c.id))by[c.provincia].v++;}); $('provinceSummary').innerHTML=Object.entries(by).sort((a,b)=>b[1].t-a[1].t).slice(0,12).map(([p,o])=>`<p><b>${esc(p)}</b><br>${o.v}/${o.t} visitadas · ${Math.round(o.v/o.t*100)}%</p>`).join('');}
function marker(c){const m=L.circleMarker([+c.lat,+c.lng],{radius:8,color:'#fff',weight:2,fillColor:colorFor(c),fillOpacity:.95}); m.bindPopup(`<div class="popup-title">${esc(c.empresa)}</div><div class="popup-meta">${esc(c.provincia)} · ${esc(c.ciudad)} · Prioridad ${c.prioridad}</div><button onclick="openClient('${c.id}')">Abrir ficha</button>`); return m;}
function renderMap(){markers.forEach(m=>map.removeLayer(m)); markers=[]; if(heatLayer){map.removeLayer(heatLayer);heatLayer=null;} const data=filtered(); data.forEach(c=>{const m=marker(c).addTo(map); markers.push(m);}); if(heatOn && window.L.heatLayer){heatLayer=L.heatLayer(data.map(c=>[+c.lat,+c.lng,(+c.potencial||2)/5]),{radius:28,blur:22}).addTo(map);} }
function renderMiniMap(){miniMarkers.forEach(m=>miniMap.removeLayer(m)); miniMarkers=[]; clients.forEach(c=>miniMarkers.push(marker(c).addTo(miniMap))); setTimeout(()=>fitMini(),200);}
function fitMap(){const group=L.featureGroup(markers); if(markers.length) map.fitBounds(group.getBounds().pad(.15));}
function fitMini(){const group=L.featureGroup(miniMarkers); if(miniMarkers.length) miniMap.fitBounds(group.getBounds().pad(.15));}
function renderClients(){const box=$('clientList'); if(!box)return; box.innerHTML=''; filtered().slice(0,300).forEach(c=>{const v=latestVisit(c.id); const el=document.createElement('div'); el.className='client'; el.onclick=()=>openClient(c.id); el.innerHTML=`<b>${esc(c.empresa)}</b><small>${esc(c.provincia)} · ${esc(c.ciudad)} · Potencial ${c.potencial}/5</small><span class="tag ${String(c.prioridad).toLowerCase()}">Prioridad ${c.prioridad}</span><span class="tag ${v?'vis':'pending'}">${v?(v.photo?'Visitado con foto':'Visitado'):'Pendiente'}</span>`; box.appendChild(el);});}
window.openClient=id=>{current=clients.find(c=>String(c.id)===String(id)); if(!current)return; const v=latestVisit(current.id); $('mName').textContent=current.empresa; $('mMeta').textContent=`${current.provincia} · ${current.ciudad} · Prioridad ${current.prioridad} · Potencial ${current.potencial}/5`; $('mDetail').innerHTML=`<p><b>Tipo:</b> ${esc(current.tipo)}</p><p><b>Rubro:</b> ${esc(current.rubro)}</p><p><b>Observaciones:</b> ${esc(current.observaciones)}</p><p><b>Última visita:</b> ${v?new Date(v.createdAt).toLocaleString()+' por '+esc(v.seller):'Sin visitas'}</p><p><a href="${esc(current.fuente)}" target="_blank">Fuente / web</a></p>`; $('notes').value=''; $('photo').value=''; $('preview').classList.add('hidden'); photoData=null; $('modal').classList.remove('hidden');};
async function saveVisit(){if(!current)return; $('saveVisit').disabled=true; $('saveVisit').textContent='Guardando...'; try{const pos=await getPos(); const visit={clientId:current.id,clientName:current.empresa,seller:session.username,status:$('visitStatus').value,notes:$('notes').value,lat:pos?.lat||null,lng:pos?.lng||null,photo:photoData,createdAt:new Date().toISOString()}; let saved=false; try{await api('/api/visits',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(visit)}); saved=true;}catch(e){} visits.push(visit); localStorage.setItem('tm_visits',JSON.stringify(visits)); $('modal').classList.add('hidden'); renderAll(); alert(saved?'Visita guardada.':'Visita guardada localmente. Revisar Functions/Blobs en Netlify.');}finally{$('saveVisit').disabled=false;$('saveVisit').textContent='Guardar visita con GPS/foto';}}
function getPos(){return new Promise(r=>{if(!navigator.geolocation)return r(null); navigator.geolocation.getCurrentPosition(p=>r({lat:p.coords.latitude,lng:p.coords.longitude}),()=>r(null),{enableHighAccuracy:true,timeout:10000});});}
function compressImage(file,max=1000,q=.72){return new Promise((res,rej)=>{const img=new Image(); img.onload=()=>{const s=Math.min(1,max/img.width); const c=document.createElement('canvas'); c.width=Math.round(img.width*s); c.height=Math.round(img.height*s); c.getContext('2d').drawImage(img,0,0,c.width,c.height); res(c.toDataURL('image/jpeg',q));}; img.onerror=rej; img.src=URL.createObjectURL(file);});}
async function addUser(){if(session.role!=='admin')return; const username=$('newUser').value.trim(), password=$('newPass').value, role=$('newRole').value; if(!username||!password)return alert('Completar usuario y contraseña'); try{await api('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add',username,password,role})}); users=await api('/api/auth?action=list'); renderUsers(); $('newUser').value=''; $('newPass').value='';}catch(e){alert('No se pudo agregar usuario');}}
function renderUsers(){const box=$('userList'); if(!box)return; box.innerHTML=users.map(u=>`<p><b>${esc(u.username)}</b> · ${esc(u.role)}</p>`).join('');}
function exportCsv(){const rows=[['ID','Empresa','Provincia','Ciudad','Prioridad','Potencial','Visitado','Ultima visita','Vendedor']]; clients.forEach(c=>{const v=latestVisit(c.id); rows.push([c.id,c.empresa,c.provincia,c.ciudad,c.prioridad,c.potencial,v?'SI':'NO',v?new Date(v.createdAt).toLocaleString():'',v?.seller||'']);}); const csv=rows.map(r=>r.map(x=>`"${String(x||'').replaceAll('"','""')}"`).join(',')).join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='alkon_trademap_export.csv'; a.click();}
function esc(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
init();
