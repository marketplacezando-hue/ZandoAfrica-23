const ORIGINS = new Set(['https://zandoafrica-23.pages.dev', 'http://localhost:5173', 'http://127.0.0.1:5173']);
const TYPES = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'video/mp4':'mp4', 'video/webm':'webm', 'video/quicktime':'mov' };
function cors(origin, publicAsset = false) {
  const h = new Headers({ 'Access-Control-Allow-Methods':'GET, HEAD, POST, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type, X-Media-Folder', 'Access-Control-Max-Age':'86400', 'Vary':'Origin' });
  if (publicAsset) h.set('Access-Control-Allow-Origin', '*'); else if (ORIGINS.has(origin)) h.set('Access-Control-Allow-Origin', origin);
  return h;
}
function json(data, status, origin) { const h=cors(origin); h.set('Content-Type','application/json; charset=utf-8'); h.set('X-Content-Type-Options','nosniff'); return new Response(JSON.stringify(data),{status,headers:h}); }
function valid(type,b) {
  if(type==='image/jpeg') return b[0]===255&&b[1]===216&&b[2]===255;
  if(type==='image/png') return [137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
  if(type==='image/webp') return String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP';
  if(type==='video/mp4'||type==='video/quicktime') return String.fromCharCode(...b.slice(4,8))==='ftyp';
  if(type==='video/webm') return b[0]===26&&b[1]===69&&b[2]===223&&b[3]===163;
  return false;
}
async function allowedUpload(req,env) {
  const ip=req.headers.get('CF-Connecting-IP'); if(!ip) return false;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
  const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('').slice(0,32);
  const key='upload:'+hash+':'+Math.floor(Date.now()/3600000);
  const n=Number(await env.UPLOAD_RATES.get(key)||'0'); if(n>=20) return false;
  await env.UPLOAD_RATES.put(key,String(n+1),{expirationTtl:7200}); return true;
}
async function media(req,env,key) {
  if(!/^(products|videos|avatars|banners)\/[0-9a-f-]+\.(jpg|png|webp|mp4|webm|mov)$/.test(key)) return new Response('Not found',{status:404});
  const head=await env.MEDIA_BUCKET.head(key); if(!head) return new Response('Not found',{status:404});
  const h=new Headers(); head.writeHttpMetadata(h); h.set('ETag',head.httpEtag); h.set('Cache-Control','public, max-age=31536000, immutable'); h.set('X-Content-Type-Options','nosniff'); h.set('Accept-Ranges','bytes'); h.set('Access-Control-Allow-Origin','*');
  let r=null; const rh=req.headers.get('Range');
  if(rh){const m=/^bytes=(\d+)-(\d*)$/.exec(rh); if(!m) return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+head.size}}); const start=Number(m[1]),end=Math.min(m[2]?Number(m[2]):head.size-1,head.size-1); if(start>=head.size||end<start) return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+head.size}}); r={start,end};}
  h.set('Content-Length',String(r?r.end-r.start+1:head.size)); if(r) h.set('Content-Range','bytes '+r.start+'-'+r.end+'/'+head.size);
  if(req.method==='HEAD') return new Response(null,{status:r?206:200,headers:h});
  const obj=r?await env.MEDIA_BUCKET.get(key,{range:{offset:r.start,length:r.end-r.start+1}}):await env.MEDIA_BUCKET.get(key);
  return obj?new Response(obj.body,{status:r?206:200,headers:h}):new Response('Not found',{status:404});
}
export default { async fetch(req,env) {
  const u=new URL(req.url), origin=req.headers.get('Origin')||'';
  if(req.method==='OPTIONS') return ORIGINS.has(origin)?new Response(null,{status:204,headers:cors(origin)}):new Response(null,{status:403});
  if(u.pathname==='/health'&&req.method==='GET') return json({ok:true,service:'zandoafrica-media'},200,origin);
  if(u.pathname==='/upload'&&req.method==='POST') {
    if(!ORIGINS.has(origin)) return json({error:'Origin not allowed'},403,origin);
    const type=(req.headers.get('Content-Type')||'').split(';')[0].trim().toLowerCase(), ext=TYPES[type];
    if(!ext) return json({error:'Unsupported media type'},415,origin);
    const limit=type.startsWith('image/')?10*1024*1024:50*1024*1024;
    if(Number(req.headers.get('Content-Length')||0)>limit) return json({error:'File too large'},413,origin);
    const folder=req.headers.get('X-Media-Folder')||(type.startsWith('image/')?'products':'videos');
    if(!['products','videos','avatars','banners'].includes(folder)) return json({error:'Invalid media folder'},400,origin);
    if(!await allowedUpload(req,env)) return json({error:'Upload limit reached'},429,origin);
    const body=await req.arrayBuffer(); if(!body.byteLength||body.byteLength>limit) return json({error:'Empty or oversized file'},413,origin);
    if(!valid(type,new Uint8Array(body.slice(0,16)))) return json({error:'File signature mismatch'},415,origin);
    const key=folder+'/'+crypto.randomUUID()+'.'+ext;
    await env.MEDIA_BUCKET.put(key,body,{httpMetadata:{contentType:type,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{folder}});
    return json({url:u.origin+'/media/'+key,key},201,origin);
  }
  if(u.pathname.startsWith('/media/')&&['GET','HEAD'].includes(req.method)) { let key; try{key=decodeURIComponent(u.pathname.slice(7));}catch{return new Response('Not found',{status:404});} return media(req,env,key); }
  return new Response('Not found',{status:404});
} };
