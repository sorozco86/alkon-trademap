const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const store = getStore('alkon-trademap');
  const key = 'visits.json';

  try {
    if (event.httpMethod === 'GET') {
      const raw = await store.get(key);
      return { statusCode: 200, headers, body: raw || '[]' };
    }

    if (event.httpMethod === 'POST') {
      const payload = JSON.parse(event.body || '{}');
      const raw = await store.get(key);
      const visits = raw ? JSON.parse(raw) : [];
      const visit = {
        id: payload.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        clientId: String(payload.clientId || ''),
        clientName: payload.clientName || '',
        seller: payload.seller || 'Sin vendedor',
        status: payload.status || 'Visitado',
        notes: payload.notes || '',
        lat: payload.lat || null,
        lng: payload.lng || null,
        photo: payload.photo || null,
        createdAt: payload.createdAt || new Date().toISOString()
      };
      visits.push(visit);
      await store.set(key, JSON.stringify(visits));
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, visit }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
