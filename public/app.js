let clients = [];
let visits = [];
let markers = [];
let heatLayer = null;
let heatOn = false;
let current = null;
let photoData = null;

const $ = (id) => document.getElementById(id);
const map = L.map('map').setView([-34.6, -58.4], 5);
const base = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '&copy; OpenStreetMap'}).addTo(map);
const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom: 19, attribution: 'Tiles &copy; Esri'});
L.control.layers({Mapa: base, Satelital: sat}).addTo(map);
const legend = L.control({position: 'bottomleft'});
legend.onAdd = () => {
  const div = L.DomUtil.create('div','legend');
  div.innerHTML = '<b>Estados</b><br><span class="dot" style="background:#ef4444"></span>Pendiente<br><span class="dot" style="background:#f59e0b"></span>Visitado sin foto<br><span class="dot" style="background:#16a34a"></span>Visitado con foto';
  return div;
};
legend.addTo(map);

async function init(){
  $('seller').value = localStorage.getItem('seller') || '';
  clients = await fetch('/data/clients.json').then(r=>r.json());
  await loadVisits();
  wire();
  render();
}

async function loadVisits(){
  try { visits = await fetch('/api/visits').then(r=>r.json()); }
  catch(e){ visits = JSON.parse(localStorage.getItem('visits')||'[]'); }
}

function latestVisit(clientId){
  return [...visits].reverse().find(v => String(v.clientId) === String(clientId));
}
function colorFor(c){
  const v = latestVisit(c.id);
  if(!v) return '#ef4444';
  return v.photo ? '#16a34a' : '#f59e0b';
}
function filteredClients(){
  const q = $('search').value.toLowerCase().trim();
  const p = $('priority').value;
  const s = $('status').value;
  return clients.filter(c=>{
    const v = latestVisit(c.id);
    const txt = `${c.empresa} ${c.provincia} ${c.ciudad} ${c.tipo}`.toLowerCase();
    if(q && !txt.includes(q)) return false;
    if(p && c.prioridad !== p) return false;
    if(s === 'pending' && v) return false;
    if(s === 'visited' && !v) return false;
    if(s === 'photo' && !(v && v.photo)) return false;
    return true;
  });
}
function render(){
  renderKpis(); renderMap(); renderList();
}
function renderKpis(){
  const visitedIds = new Set(visits.map(v=>String(v.clientId)));
  $('kTotal').textContent = clients.length;
  $('kVisited').textContent = visitedIds.size;
  $('kPending').textContent = clients.length - visitedIds.size;
  $('kCoverage').textContent = clients.length ? Math.round(visitedIds.size/clients.length*100)+'%' : '0%';
}
function renderMap(){
  markers.forEach(m=>map.removeLayer(m)); markers=[];
  if(heatLayer){ map.removeLayer(heatLayer); heatLayer=null; }
  const data = filteredClients();
  data.forEach(c=>{
    const v = latestVisit(c.id);
    const marker = L.circleMarker([c.lat,c.lng], {radius: 8, color:'#fff', weight:2, fillColor: colorFor(c), fillOpacity:.95});
    marker.bindPopup(`<div class="popup-title">${escapeHtml(c.empresa)}</div><div class="popup-meta">${escapeHtml(c.provincia)} · Prioridad ${c.prioridad} · Potencial ${c.potencial}/5</div><button class="popup-btn" onclick="openClient('${c.id}')">Abrir ficha</button>`);
    marker.addTo(map); markers.push(marker);
  });
  if(heatOn){ heatLayer = L.heatLayer(data.map(c=>[c.lat,c.lng, c.potencial/5]), {radius: 28, blur: 22}).addTo(map); }
}
function renderList(){
  const box = $('clientList'); box.innerHTML='';
  filteredClients().slice(0,200).forEach(c=>{
    const v = latestVisit(c.id);
    const el = document.createElement('div'); el.className='client'; el.onclick=()=>openClient(c.id);
    el.innerHTML = `<b>${escapeHtml(c.empresa)}</b><small>${escapeHtml(c.provincia)} · ${escapeHtml(c.ciudad)} · Potencial ${c.potencial}/5</small><br><span class="tag ${c.prioridad.toLowerCase()}">Prioridad ${c.prioridad}</span><span class="tag ${v?'vis':'pending'}">${v ? (v.photo ? 'Visitado con foto' : 'Visitado') : 'Pendiente'}</span>`;
    box.appendChild(el);
  });
}
window.openClient = function(id){
  current = clients.find(c=>String(c.id)===String(id));
  if(!current) return;
  const v = latestVisit(current.id);
  $('mName').textContent = current.empresa;
  $('mMeta').textContent = `${current.provincia} · ${current.ciudad} · Prioridad ${current.prioridad} · Potencial ${current.potencial}/5`;
  $('mDetail').innerHTML = `<b>Tipo:</b> ${escapeHtml(current.tipo)}<br><b>Rubro:</b> ${escapeHtml(current.rubro)}<br><b>Observaciones:</b> ${escapeHtml(current.observaciones)}<br><b>Última visita:</b> ${v ? new Date(v.createdAt).toLocaleString() + ' por ' + escapeHtml(v.seller) : 'Sin visitas'}`;
  $('notes').value = '';
  $('photo').value = '';
  $('preview').classList.add('hidden'); photoData=null;
  $('modal').classList.remove('hidden');
}
function wire(){
  ['search','priority','status'].forEach(id => $(id).addEventListener('input', render));
  $('toggleHeat').onclick = () => { heatOn = !heatOn; $('toggleHeat').classList.toggle('primary', heatOn); renderMap(); };
  $('closeModal').onclick = () => $('modal').classList.add('hidden');
  $('saveSeller').onclick = () => { localStorage.setItem('seller', $('seller').value.trim()); alert('Vendedor guardado'); };
  $('photo').onchange = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    photoData = await compressImage(file, 1000, .7);
    $('preview').src = photoData; $('preview').classList.remove('hidden');
  };
  $('saveVisit').onclick = saveVisit;
  $('exportCsv').onclick = exportCsv;
}
async function saveVisit(){
  if(!current) return;
  const seller = $('seller').value.trim();
  if(!seller){ alert('Primero ingresá el nombre del vendedor.'); return; }
  localStorage.setItem('seller', seller);
  $('saveVisit').disabled = true; $('saveVisit').textContent='Guardando...';
  try{
    const pos = await getPositionSafe();
    const visit = {clientId: current.id, clientName: current.empresa, seller, status: $('visitStatus').value, notes: $('notes').value, lat: pos?.lat || null, lng: pos?.lng || null, photo: photoData, createdAt: new Date().toISOString()};
    let ok = false;
    try { const res = await fetch('/api/visits', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(visit)}); ok = res.ok; }
    catch(e){ ok = false; }
    visits.push(visit);
    localStorage.setItem('visits', JSON.stringify(visits));
    $('modal').classList.add('hidden'); render();
    alert(ok ? 'Visita guardada en la nube.' : 'Visita guardada localmente. Al publicar en Netlify con Functions se guarda compartida.');
  } finally { $('saveVisit').disabled = false; $('saveVisit').textContent='Guardar visita con GPS/foto'; }
}
function getPositionSafe(){
  return new Promise(resolve=>{
    if(!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude}),()=>resolve(null),{enableHighAccuracy:true,timeout:10000});
  });
}
function compressImage(file, maxWidth=1000, quality=.7){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width*scale); canvas.height = Math.round(img.height*scale);
      const ctx = canvas.getContext('2d'); ctx.drawImage(img,0,0,canvas.width,canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
function exportCsv(){
  const rows = [['ID','Empresa','Provincia','Ciudad','Prioridad','Potencial','Visitado','Ultima visita','Vendedor']];
  clients.forEach(c=>{const v=latestVisit(c.id); rows.push([c.id,c.empresa,c.provincia,c.ciudad,c.prioridad,c.potencial,v?'SI':'NO',v?new Date(v.createdAt).toLocaleString():'',v?.seller||'']);});
  const csv = rows.map(r=>r.map(x=>`"${String(x||'').replaceAll('"','""')}"`).join(',')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='alkon_trademap_export.csv'; a.click();
}
function escapeHtml(s){ return String(s||'').replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
init();
