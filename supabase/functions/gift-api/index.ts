import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { normalize, similarity } from './scoring.ts';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{persistSession:false}});
const bucket = db.storage.from('gift-private');
const origins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://shiyanliu.com,https://shiyan-liu.github.io,http://127.0.0.1:5173').split(',');
const model = Deno.env.get('EMBEDDING_MODEL') || 'text-embedding-3-small';
function check<T>(result: {data:T;error:any}): T { if(result.error) throw result.error; return result.data; }
function text(value: unknown, max: number) { if(typeof value !== 'string' || !value.trim() || value.trim().length>max) throw new Error('INVALID_INPUT'); return value.trim(); }
function uuid(value: unknown) { if(typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new Error('INVALID_INPUT'); return value; }
async function embed(input: string, useModel = model): Promise<number[]> {
 const key = Deno.env.get('EMBEDDING_API_KEY'); if(!key) throw new Error('EMBEDDING_UNAVAILABLE');
 const response = await fetch(Deno.env.get('EMBEDDING_API_URL') || 'https://api.openai.com/v1/embeddings', {
 method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},
 body:JSON.stringify({model:useModel,input}),signal:AbortSignal.timeout(20000)});
 if(!response.ok) throw new Error('EMBEDDING_UNAVAILABLE');
 const data = await response.json(); const vector = data.data?.[0]?.embedding;
 if(!Array.isArray(vector) || !vector.length || vector.some((v:unknown)=>typeof v!=='number'||!Number.isFinite(v))) throw new Error('EMBEDDING_UNAVAILABLE');
 return vector;
}
async function signed(path: string) { return check(await bucket.createSignedUrl(path,600)).signedUrl; }
async function state(user: string) {
 const member=check(await db.from('gift_members').select('balance').eq('user_id',user).single());
 const games=check(await db.from('gift_games').select('id,title,status,created_at').neq('status','archived').order('created_at',{ascending:false}).limit(1));
 const game=games[0]||null;
 const guesses=game?check(await db.from('gift_guesses').select('id,text,score,is_correct,created_at').eq('game_id',game.id).eq('user_id',user).order('created_at',{ascending:false}).limit(200)):[];
 let reveal=null;
 if(game&&['won','revealed'].includes(game.status)) {
   const secret=check(await db.from('gift_game_secrets').select('answer,reveal_text,reveal_photo_id').eq('game_id',game.id).single());
   let image=null;
   if(secret.reveal_photo_id) {const photo=check(await db.from('gift_photos').select('storage_path').eq('id',secret.reveal_photo_id).is('deleted_at',null).maybeSingle());if(photo)image=await signed(photo.storage_path);}
   reveal={answer:secret.answer,text:secret.reveal_text,image};
 }
 return {member,game,guesses,reveal};
}
Deno.serve(async req=>{
 const origin = req.headers.get('Origin') || '';
 const headers = {'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
 'Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],
 'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const reply = (data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin && !origins.includes(origin)) return reply({error:'FORBIDDEN'},403);
 if(req.method==='OPTIONS') return new Response(null,{status:204,headers});
 if(req.method!=='POST') return reply({error:'METHOD_NOT_ALLOWED'},405);
 try {
 const raw = await req.text(); if(raw.length>16000) throw new Error('INVALID_INPUT');
 const body = JSON.parse(raw); const action = text(body.action,30);
 if(action==='enter') {
   const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
   const bytes=new TextEncoder().encode(ip+':' +(Deno.env.get('LOGIN_RATE_SALT')||''));
   const ipHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
   if(!check(await db.rpc('gift_login_rate',{p_key:ipHash}))) return reply({error:'RATE_LIMITED'},429);
   const code=text(body.code,100).normalize('NFKC').trim();
   const player=Deno.env.get('PLAYER_CODE');
   const email=code===player?Deno.env.get('PLAYER_LOGIN_EMAIL'):null;
   const password=code===player?Deno.env.get('PLAYER_LOGIN_PASSWORD'):null;
   if(!email||!password) return reply({error:'UNAUTHORIZED'},401);
   const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false}});
   const result=await auth.auth.signInWithPassword({email,password});
   if(result.error||!result.data.session) return reply({error:'UNAUTHORIZED'},401);
   return reply({access_token:result.data.session.access_token,refresh_token:result.data.session.refresh_token});
 }
 const token = req.headers.get('Authorization')?.replace(/^Bearer /i,'');
 if(!token) return reply({error:'UNAUTHORIZED'},401);
 const {data:{user},error} = await db.auth.getUser(token);
 if(error||!user) return reply({error:'UNAUTHORIZED'},401);
 const {data:member,error:memberError} = await db.from('gift_members').select('*').eq('user_id',user.id).maybeSingle();
 if(memberError) throw memberError; if(!member) return reply({error:'FORBIDDEN'},403);
 const limit = ['guess','upload-intent','finalize-upload'].includes(action)?12:60;
 if(!check(await db.rpc('gift_rate',{p_user:user.id,p_action:action,p_limit:limit}))) return reply({error:'RATE_LIMITED'},429);
 if(action==='state') return reply(await state(user.id));
 if(action==='upload-intent') {
 const id=crypto.randomUUID(),path=`staging/${user.id}/${id}.jpg`;
 check(await db.from('gift_upload_intents').insert({id,user_id:user.id,path}));
 const upload=check(await bucket.createSignedUploadUrl(path));
 return reply({id,path,token:upload.token});
 }
 if(action==='finalize-upload') {
 const id=uuid(body.id);
 const intent=check(await db.from('gift_upload_intents').select('*').eq('id',id).eq('user_id',user.id).single());
 if(intent.finalized) return reply({duplicate:true,balance:member.balance});
 if(Date.parse(intent.created_at)<Date.now()-7200000) throw new Error('UPLOAD_EXPIRED');
 const blob=check(await bucket.download(intent.path));
 if(blob.size>5242880||blob.size<16) throw new Error('INVALID_IMAGE');
 const bytes=new Uint8Array(await blob.arrayBuffer());
 if(bytes[0]!==255||bytes[1]!==216||bytes[2]!==255) throw new Error('INVALID_IMAGE');
 // Read JPEG dimensions before decoding to avoid decompression bombs.
 let pos=2,width=0,height=0;
 while(pos+9<bytes.length) {
 if(bytes[pos++]!==255) continue; const marker=bytes[pos++];
 if(marker===0xda||marker===0xd9) break;
 if(marker===0xd8||marker===0x01||(marker>=0xd0&&marker<=0xd7)) continue;
 const len=(bytes[pos]<<8)+bytes[pos+1]; if(len<2||pos+len>bytes.length) throw new Error('INVALID_IMAGE');
 if([0xc0,0xc1,0xc2].includes(marker)) {height=(bytes[pos+3]<<8)+bytes[pos+4];width=(bytes[pos+5]<<8)+bytes[pos+6];break;}
 pos+=len;
 }
 if(!width||!height||width*height>12000000||width>4096||height>4096) throw new Error('INVALID_IMAGE');
 // The public client already resizes and re-encodes images as JPEG. Avoid a
 // WASM image dependency here; the server still validates JPEG markers,
 // dimensions, and the byte-size limit before storing the upload.
 const clean=bytes;
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',clean))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const path=`photos/${user.id}/${id}.jpg`;
 // Stable immutable path makes retried finalization safe, even in parallel.
 const stored=await bucket.upload(path,clean,{contentType:'image/jpeg',upsert:false});
 if(stored.error && !['409','Duplicate'].includes(String((stored.error as any).statusCode)) && !/already exists|duplicate/i.test(stored.error.message)) throw stored.error;
 const result:any=check(await db.rpc('gift_finalize',{p_user:user.id,p_intent:id,p_hash:hash,p_path:path}));
 await bucket.remove([intent.path]);
 if(result.duplicate&&result.photo_id!==id) await bucket.remove([path]);
 return reply(result);
 }
 if(action==='guess') {
 if(member.role!=='player') throw new Error('FORBIDDEN');
 const gameId=uuid(body.gameId),guess=text(body.text,80),normalized=normalize(guess);
 if(!normalized) throw new Error('INVALID_INPUT');
 const existing=check(await db.from('gift_guesses').select('*').eq('game_id',gameId).eq('user_id',user.id).eq('normalized',normalized).maybeSingle());
 if(existing) return reply({guess:existing,balance:member.balance,duplicate:true});
 const game=check(await db.from('gift_games').select('status').eq('id',gameId).single());
 if(game.status!=='active') throw new Error('GAME_CHANGED');
 if(member.balance<1) throw new Error('NO_CREDITS');
 const secret=check(await db.from('gift_game_secrets').select('answer,aliases,embedding,model').eq('game_id',gameId).single());
 const correct=[secret.answer,...secret.aliases].some(s=>normalize(s)===normalized);
 const score=correct?100:similarity(await embed(guess,secret.model),secret.embedding);
 return reply(check(await db.rpc('gift_guess',{p_user:user.id,p_game:gameId,p_text:guess,p_normalized:normalized,p_score:score,p_correct:correct})));
 }
 throw new Error('INVALID_INPUT');
 } catch(e) {
 const message=e instanceof Error?e.message:String((e as any)?.message || '');
 const allowed=['FORBIDDEN','NO_CREDITS','GAME_CHANGED','INVALID_INPUT','UPLOAD_EXPIRED','INVALID_IMAGE','EMBEDDING_UNAVAILABLE','MODEL_MISMATCH'];
 const code=allowed.find(c=>message.includes(c))||'SERVER_ERROR';
 console.error('gift-api failure',code); // Never log answers, images, tokens or provider responses.
 return reply({error:code},code==='FORBIDDEN'?403:code==='SERVER_ERROR'||code==='EMBEDDING_UNAVAILABLE'?503:400);
 }
});
