const ORIGINS = new Set([
  'https://marketplacezando-hue.github.io',
  'https://zando-africa.vercel.app',
  'https://zando-africa-23.vercel.app',
  'https://zando-africa-23-konolive23.vercel.app',
  'https://zando-africa-23-git-feat-moneroo-integration-konolive23.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
function isAllowedOrigin(origin) {
  if (ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'https:' && url.origin === origin && /^zando-africa-23-[a-z0-9]+-konolive23\.vercel\.app$/.test(url.hostname);
  } catch {
    return false;
  }
}
const TYPES = { 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'video/mp4':'mp4', 'video/webm':'webm', 'video/quicktime':'mov' };
function cors(origin, publicAsset = false) {
  const h = new Headers({ 'Access-Control-Allow-Methods':'GET, HEAD, POST, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type, X-Media-Folder', 'Access-Control-Max-Age':'86400', 'Vary':'Origin' });
  if (publicAsset) h.set('Access-Control-Allow-Origin', '*'); else if (isAllowedOrigin(origin)) h.set('Access-Control-Allow-Origin', origin);
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
const DIGITAL_MAX_BYTES=20*1024*1024;
const DIGITAL_KEY=/^digital\/(originals|previews)\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/;
function constantTimeEqual(a,b) {
  const aa=new TextEncoder().encode(a), bb=new TextEncoder().encode(b), length=Math.max(aa.length,bb.length);
  let diff=aa.length^bb.length;
  for(let i=0;i<length;i++) diff|=(aa[i]||0)^(bb[i]||0);
  return diff===0;
}
function digitalAuthorized(req,env) {
  const secret=typeof env.DIGITAL_BOOKS_STORAGE_SECRET==='string'?env.DIGITAL_BOOKS_STORAGE_SECRET:'';
  const auth=req.headers.get('Authorization')||'';
  return !!secret&&auth.startsWith('Bearer ')&&constantTimeEqual(auth.slice(7),secret);
}
function digitalOriginAllowed(req) {
  const origin=req.headers.get('Origin');
  return origin===null||isAllowedOrigin(origin);
}
function digitalJson(data,status) {
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'}});
}
function digitalKey(url) {
  const key=url.searchParams.get('key');
  return key&&DIGITAL_KEY.test(key)?key:null;
}
async function digitalRateLimit(req,env) {
  if(!digitalAuthorized(req,env)) return digitalJson({error:'Unauthorized'},401);
  if(!digitalOriginAllowed(req)) return digitalJson({error:'Origin not allowed'},403);
  if(!env.UPLOAD_RATES) return digitalJson({error:'Rate limiter unavailable'},503);
  const declared=Number(req.headers.get('Content-Length')||'0');
  if(declared>256) return digitalJson({error:'Request too large'},413);
  let body;
  try { body=await req.json(); } catch { return digitalJson({error:'Invalid request'},400); }
  const scope=body?.scope, ip=typeof body?.client_ip==='string'?body.client_ip.trim().toLowerCase():'';
  if(!['upload','preview','create_purchase','download'].includes(scope)||ip.length<2||ip.length>100||/[\r\n]/.test(ip)) return digitalJson({error:'Invalid rate-limit identity'},400);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
  const hash=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('').slice(0,32);
  const hour=Math.floor(Date.now()/3600000), key=`digital:${scope}:${hash}:${hour}`;
  const limits={upload:8,preview:90,create_purchase:30,download:30};
  const count=Number(await env.UPLOAD_RATES.get(key)||'0');
  const maximum=limits[scope];
  if(count>=maximum) {
    console.log(JSON.stringify({event:'digital_rate_limited',scope}));
    return digitalJson({error:'Request limit reached'},429);
  }
  await env.UPLOAD_RATES.put(key,String(count+1),{expirationTtl:7200});
  return digitalJson({ok:true,remaining:maximum-count-1},200);
}
async function digitalUpload(req,env,url) {
  if(!digitalAuthorized(req,env)) { console.log(JSON.stringify({event:'digital_upload_denied',reason:'authorization'})); return digitalJson({error:'Unauthorized'},401); }
  if(!digitalOriginAllowed(req)) { console.log(JSON.stringify({event:'digital_upload_denied',reason:'origin'})); return digitalJson({error:'Origin not allowed'},403); }
  const key=digitalKey(url);
  if(!key) return digitalJson({error:'Invalid digital key'},400);
  const type=(req.headers.get('Content-Type')||'').split(';')[0].trim().toLowerCase();
  if(type!=='application/pdf') return digitalJson({error:'PDF required'},415);
  if(Number(req.headers.get('Content-Length')||0)>DIGITAL_MAX_BYTES) return digitalJson({error:'File too large'},413);
  const body=await req.arrayBuffer();
  if(!body.byteLength||body.byteLength>DIGITAL_MAX_BYTES) return digitalJson({error:'Empty or oversized file'},413);
  const signature=new Uint8Array(body.slice(0,5));
  if(signature.length!==5||signature[0]!==37||signature[1]!==80||signature[2]!==68||signature[3]!==70||signature[4]!==45) return digitalJson({error:'PDF signature mismatch'},415);
  await env.MEDIA_BUCKET.put(key,body,{httpMetadata:{contentType:'application/pdf'}});
  console.log(JSON.stringify({event:'digital_upload_ok',kind:key.split('/')[1],size:body.byteLength}));
  return digitalJson({ok:true},201);
}
async function digitalGet(req,env,url) {
  if(!digitalAuthorized(req,env)) { console.log(JSON.stringify({event:'digital_get_denied',reason:'authorization'})); return new Response('Unauthorized',{status:401}); }
  if(!digitalOriginAllowed(req)) { console.log(JSON.stringify({event:'digital_get_denied',reason:'origin'})); return new Response('Origin not allowed',{status:403}); }
  if(req.headers.has('Range')) return new Response('Range not supported',{status:416});
  const key=digitalKey(url);
  if(!key) return new Response('Not found',{status:404});
  const obj=await env.MEDIA_BUCKET.get(key);
  if(!obj) return new Response('Not found',{status:404});
  console.log(JSON.stringify({event:'digital_get_ok',kind:key.split('/')[1]}));
  return new Response(obj.body,{status:200,headers:{'Content-Type':'application/pdf','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
async function digitalDelete(req,env,url) {
  if(!digitalAuthorized(req,env)) return digitalJson({error:'Unauthorized'},401);
  if(!digitalOriginAllowed(req)) return digitalJson({error:'Origin not allowed'},403);
  const key=digitalKey(url);
  if(!key) return digitalJson({error:'Invalid digital key'},400);
  await env.MEDIA_BUCKET.delete(key);
  console.log(JSON.stringify({event:'digital_object_deleted',kind:key.split('/')[1]}));
  return digitalJson({ok:true},200);
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
  if(u.pathname==='/digital-internal/upload') {
    if(req.method!=='POST') return new Response('Method not allowed',{status:405});
    return digitalUpload(req,env,u);
  }
  if(u.pathname==='/digital-internal/get') {
    if(req.method!=='GET') return new Response('Method not allowed',{status:405});
    return digitalGet(req,env,u);
  }
  if(u.pathname==='/digital-internal/limit') {
    if(req.method!=='POST') return new Response('Method not allowed',{status:405});
    return digitalRateLimit(req,env);
  }
  if(u.pathname==='/digital-internal/delete') {
    if(req.method!=='DELETE') return new Response('Method not allowed',{status:405});
    return digitalDelete(req,env,u);
  }
  if(req.method==='OPTIONS') return isAllowedOrigin(origin)?new Response(null,{status:204,headers:cors(origin)}):new Response(null,{status:403});
  if(u.pathname==='/health'&&req.method==='GET') return json({ok:true,service:'zandoafrica-media'},200,origin);
  if(u.pathname==='/upload'&&req.method==='POST') {
    if(!isAllowedOrigin(origin)) return json({error:'Origin not allowed'},403,origin);
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
