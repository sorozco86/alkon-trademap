import { getStore } from '@netlify/blobs';
const store = getStore('alkon-trademap-photos');
export async function handler(event){
  const key = event.queryStringParameters?.key;
  if(!key) return {statusCode:400, body:'missing key'};
  const dataUrl = await store.get(key);
  if(!dataUrl) return {statusCode:404, body:'not found'};
  const [, meta, data] = dataUrl.match(/^data:(.*?);base64,(.*)$/) || [];
  return { statusCode:200, headers:{'content-type':meta || 'image/jpeg','cache-control':'public,max-age=31536000'}, body:data, isBase64Encoded:true };
}
