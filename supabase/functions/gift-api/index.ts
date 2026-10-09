import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { normalize, similarity } from './scoring.ts';
import { TEASE_MODEL, teaseRequest, validateTease } from './tease.mjs';
import { validateMedia, parseVerification, verificationRequest } from './face-verification.mjs';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{persistSession:false}});
const bucket = db.storage.from('gift-private');
const origins = (Deno.env.get('ALLOWED_ORIGINS') || 'https://shiyanliu.com,https://shiyan-liu.github.io,http://127.0.0.1:5173').split(',');
const model = Deno.env.get('EMBEDDING_MODEL') || 'text-embedding-3-small';
function check<T>(result: {data:T;error:any}): T { if(result.error) throw result.error; return result.data; }
function text(value: unknown, max: number) { if(typeof value !== 'string' || !value.trim() || value.trim().length>max) throw new Error('INVALID_INPUT'); return value.trim(); }
function uuid(value: unknown) { if(typeof value !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)) throw new Error('INVALID_INPUT'); return value; }
const publicUrl='https://shiyanliu.com/gift/';
function mailConfig(){const key=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('GIFT_FROM_EMAIL');if(!key||!from)throw Error('MAIL_UNAVAILABLE');return {key,from};}
function visionConfig(){const key=Deno.env.get('VISION_API_KEY')||Deno.env.get('EMBEDDING_API_KEY');const model=Deno.env.get('VISION_MODEL');if(!key||!model)throw Error('FACE_UNAVAILABLE');return {key,model};}
async function sendMail(to:string,subject:string,body:string,idempotencyKey:string){const {key,from}=mailConfig();const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},body:JSON.stringify({from,to:[to],subject,text:body}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('MAIL_UNAVAILABLE');return await response.json();}

async function digest(value:string){const bytes=new TextEncoder().encode(value);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');}
function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');}
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
function dataUrl(bytes:Uint8Array,mime:string){let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return `data:${mime};base64,${btoa(binary)}`;}
async function verifyUploadedMedia(bytes:Uint8Array,mime:string){
 validateMedia(bytes,mime);
 const ref=check(await db.from('gift_face_reference').select('storage_path,mime_type,image_hash').eq('id',true).maybeSingle());if(!ref)throw Error('FACE_REFERENCE_MISSING');
 const blob=check(await bucket.download(ref.storage_path));if(blob.size>8*1024*1024)throw Error('FACE_UNAVAILABLE');
 const reference=dataUrl(new Uint8Array(await blob.arrayBuffer()),ref.mime_type||'image/jpeg');
 const {key,model}=visionConfig();
 const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':'https://shiyanliu.com/gift/','X-Title':'Guess My Gift verification'},body:JSON.stringify(verificationRequest(model,reference,dataUrl(bytes,mime),mime)),signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('FACE_UNAVAILABLE');const result=await response.json();
 const verdict=parseVerification(result.choices?.[0]?.message?.content);
 const current=check(await db.from('gift_face_reference').select('image_hash').eq('id',true).maybeSingle());
 if(current?.image_hash!==ref.image_hash)throw Error('FACE_REFERENCE_CHANGED');
 return {...verdict,model,referenceHash:ref.image_hash};
}
async function state(user: string) {
 const member=check(await db.from('gift_members').select('balance').eq('user_id',user).single());
 const games=check(await db.from('gift_games').select('id,title,status,created_at').order('created_at',{ascending:false}));
 const game=games.find(g=>g.status==='active')||null;
 const allGuesses=check(await db.from('gift_guesses').select('id,game_id,text,score,is_correct,created_at').eq('user_id',user).order('created_at',{ascending:false}));
 const allWhispers=check(await db.from('gift_whispers').select('id,game_id,message,reply,status,created_at').eq('user_id',user).order('created_at',{ascending:false}));
 const whispers=game?allWhispers.filter(w=>w.game_id===game.id):[];
 const guesses=game?allGuesses.filter(g=>g.game_id===game.id):[];
 async function revealFor(item: {id:string;status:string}) {
   if(!['won','revealed'].includes(item.status)) return null;
   const secret=check(await db.from('gift_game_secrets').select('answer,reveal_text,reveal_photo_id').eq('game_id',item.id).single());
   let image=null;
   if(secret.reveal_photo_id) {const photo=check(await db.from('gift_photos').select('storage_path').eq('id',secret.reveal_photo_id).is('deleted_at',null).maybeSingle());if(photo)image=await signed(photo.storage_path);}
   return {answer:secret.answer,text:secret.reveal_text,image};
 }
 const reveal=game?await revealFor(game):null;
 const history=await Promise.all(games.filter(g=>g.id!==game?.id).map(async g=>({
   ...g,whispers:allWhispers.filter(x=>x.game_id===g.id),guesses:allGuesses.filter(x=>x.game_id===g.id),reveal:await revealFor(g)
 })));
 const subscription=check(await db.from('gift_email_subscriptions').select('email,status').eq('user_id',user).maybeSingle());
 return {member,game,guesses,whispers,reveal,history,subscription,teaseReady:!!(Deno.env.get('TEASE_API_KEY')||Deno.env.get('EMBEDDING_API_KEY')),mailReady:!!Deno.env.get('RESEND_API_KEY')&&!!Deno.env.get('GIFT_FROM_EMAIL')};
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
 if(action==='subscription-link') {
   const kind=text(body.kind,20),value=text(body.token,64);
   if(!['confirm','unsubscribe'].includes(kind)||!/^[a-f0-9]{64}$/.test(value))throw Error('INVALID_INPUT');
   const hash=await digest(value),column=kind==='confirm'?'confirm_hash':'unsubscribe_hash';
   const sub=check(await db.from('gift_email_subscriptions').select('user_id,status').eq(column,hash).maybeSingle());
   if(!sub)return reply({error:'LINK_EXPIRED'},400);
   if(kind==='confirm') {
     if(sub.status!=='pending')return reply({error:'LINK_EXPIRED'},400);
     check(await db.from('gift_email_subscriptions').update({status:'active',confirmed_at:new Date().toISOString(),confirm_hash:null}).eq('user_id',sub.user_id).eq('confirm_hash',hash));
   } else {
     check(await db.from('gift_email_subscriptions').update({status:'unsubscribed',confirm_hash:null}).eq('user_id',sub.user_id).eq('unsubscribe_hash',hash));
   }
   return reply({status:kind==='confirm'?'active':'unsubscribed'});
 }
 const token = req.headers.get('Authorization')?.replace(/^Bearer /i,'');
 if(!token) return reply({error:'UNAUTHORIZED'},401);
 const {data:{user},error} = await db.auth.getUser(token);
 if(error||!user) return reply({error:'UNAUTHORIZED'},401);
 const {data:member,error:memberError} = await db.from('gift_members').select('*').eq('user_id',user.id).maybeSingle();
 if(memberError) throw memberError; if(!member) return reply({error:'FORBIDDEN'},403);
 const limit = ['guess','upload-intent','finalize-upload','media-upload-intent','finalize-media','face-check'].includes(action)?12:60;
 if(action!=='tease' && !check(await db.rpc('gift_rate',{p_user:user.id,p_action:action,p_limit:limit}))) return reply({error:'RATE_LIMITED'},429);
 if(action==='state') return reply(await state(user.id));
 if(action==='tease') {
  if(member.role!=='player')throw Error('FORBIDDEN');
  if(member.balance<1)throw Error('NO_CREDITS');
  const gameId=uuid(body.gameId),message=text(body.message,160);
  const game=check(await db.from('gift_games').select('status,title').eq('id',gameId).maybeSingle());
  if(game?.status!=='active')throw Error('GAME_CHANGED');
  const key=Deno.env.get('TEASE_API_KEY')||Deno.env.get('EMBEDDING_API_KEY');if(!key)throw Error('TEASE_UNAVAILABLE');
  const secret=check(await db.from('gift_game_secrets').select('answer,aliases').eq('game_id',gameId).single());
  const model=Deno.env.get('TEASE_MODEL')||TEASE_MODEL;
  const record=check(await db.from('gift_whispers').insert({game_id:gameId,user_id:user.id,message,model}).select('id').single());
  try {
   const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':publicUrl,'X-Title':'Gift little whispers'},body:JSON.stringify(teaseRequest(message,{title:game.title,answer:secret.answer},model)),signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('TEASE_UNAVAILABLE');const result=await response.json();
   if(result.choices?.[0]?.finish_reason!=='stop')throw Error('TEASE_UNAVAILABLE');
   const answer=validateTease(result.choices?.[0]?.message?.content,secret.answer,secret.aliases);
   const completed=check(await db.rpc('gift_complete_whisper',{p_user:user.id,p_id:record.id,p_reply:answer,p_cost:result.usage?.cost??null,p_prompt_tokens:result.usage?.prompt_tokens??null,p_completion_tokens:result.usage?.completion_tokens??null}));
   return reply(completed);
  } catch(error) {
   check(await db.from('gift_whispers').update({status:'failed'}).eq('id',record.id).eq('status','pending'));
   throw error;
  }
 }

 // Detached browser-frame checks cannot authorize an upload.
 if(action==='face-check'||action==='upload-intent'||action==='finalize-upload')throw Error('INVALID_INPUT');
 if(action==='subscribe') {
   if(member.role!=='player')throw Error('FORBIDDEN');
   mailConfig();
   const email=text(body.email,254).toLowerCase();
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('INVALID_INPUT');
   const confirm=randomToken(),unsubscribe=randomToken();
   const result=check(await db.rpc('gift_prepare_subscription',{p_user:user.id,p_email:email,p_confirm_hash:await digest(confirm),p_unsubscribe_hash:await digest(unsubscribe)}));
   if(result==='send') {
     const link=`${publicUrl}?subscription=confirm&token=${confirm}`;
     try {await sendMail(email,'请确认你的邮箱 · Guess My Gift',`想在新礼物藏好时收到我的小纸条吗？\n点一下这里，确认这真的是你的邮箱：\n\n${link}\n\n如果不是你留下的邮箱，就让这封信轻轻路过吧。`,`gift-confirm/${user.id}/${await digest(confirm)}`);}
     catch(e) {await db.from('gift_email_subscriptions').update({last_confirmation_sent_at:new Date(Date.now()-3700000).toISOString()}).eq('user_id',user.id).eq('confirm_hash',await digest(confirm));throw Error('MAIL_UNAVAILABLE');}
   }
   return reply({status:result==='send'?'pending':result});
 }
 if(action==='unsubscribe') {
   check(await db.from('gift_email_subscriptions').update({status:'unsubscribed',confirm_hash:null}).eq('user_id',user.id));
   return reply({status:'unsubscribed'});
 }
 if(action==='media-upload-intent') {
  if(member.role!=='player')throw Error('FORBIDDEN');visionConfig();
  const ref=check(await db.from('gift_face_reference').select('id').eq('id',true).maybeSingle());if(!ref)throw Error('FACE_REFERENCE_MISSING');
  const mime=text(body.mime,30);if(!['image/jpeg','video/mp4','video/webm'].includes(mime))throw Error('INVALID_MEDIA');
  const id=crypto.randomUUID(),path=`staging/${user.id}/${id}`;
  check(await db.from('gift_upload_intents').insert({id,user_id:user.id,path,mime_type:mime}));
  const upload=check(await bucket.createSignedUploadUrl(path));return reply({id,path,token:upload.token,mime});
 }
 if(action==='finalize-media') {
  if(member.role!=='player')throw Error('FORBIDDEN');
  const id=uuid(body.id);
  const intent=check(await db.from('gift_upload_intents').select('*').eq('id',id).eq('user_id',user.id).single());
  if(intent.finalized)return reply({duplicate:true,balance:member.balance});
  if(Date.parse(intent.created_at)<Date.now()-7200000)throw Error('UPLOAD_EXPIRED');
  const mime=intent.mime_type;if(!mime)throw Error('INVALID_MEDIA');
  const blob=check(await bucket.download(intent.path));
  if(blob.size<16||blob.size>(mime.startsWith('video/')?10:5)*1024*1024)throw Error('INVALID_MEDIA');
  const bytes=new Uint8Array(await blob.arrayBuffer());validateMedia(bytes,mime);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
  let verification;
  try {verification=await verifyUploadedMedia(bytes,mime);}
  catch(e){if(e instanceof Error&&e.message==='FACE_MISMATCH')await bucket.remove([intent.path]);throw e;}
  const path=`media/${user.id}/${id}/${hash}`;
  // Save exactly the checked bytes, never re-copy a mutable staging object.
  const stored=await bucket.upload(path,bytes,{contentType:mime,upsert:false});
  if(stored.error&&!/already exists|duplicate/i.test(stored.error.message))throw stored.error;
  const result:any=check(await db.rpc('gift_finalize_verified_media',{p_user:user.id,p_id:id,p_hash:hash,p_path:path,p_mime:mime,p_reference_hash:verification.referenceHash,p_model:verification.model,p_confidence:verification.confidence}));
  await bucket.remove([intent.path]);if(result.duplicate&&result.media_id!==id)await bucket.remove([path]);return reply(result);
 }
 if(action==='guess') {
 if(member.role!=='player') throw new Error('FORBIDDEN');
 const gameId=uuid(body.gameId),guess=text(body.text,80),normalized=normalize(guess);
 if(!normalized) throw new Error('INVALID_INPUT');
 const existing=check(await db.from('gift_guesses').select('*').eq('game_id',gameId).eq('user_id',user.id).eq('normalized',normalized).maybeSingle());
 if(existing) return reply({guess:existing,balance:member.balance,duplicate:true});
 const game=check(await db.from('gift_games').select('status').eq('id',gameId).single());
 if(game.status!=='active') throw new Error('GAME_CHANGED');
 if(member.balance<2) throw new Error('NO_CREDITS');
 const secret=check(await db.from('gift_game_secrets').select('answer,aliases,embedding,model').eq('game_id',gameId).single());
 const correct=[secret.answer,...secret.aliases].some(s=>normalize(s)===normalized);
 const score=correct?100:similarity(await embed(guess,secret.model),secret.embedding);
 return reply(check(await db.rpc('gift_guess',{p_user:user.id,p_game:gameId,p_text:guess,p_normalized:normalized,p_score:score,p_correct:correct})));
 }
 throw new Error('INVALID_INPUT');
 } catch(e) {
 const message=e instanceof Error?e.message:String((e as any)?.message || '');
 const allowed=['FORBIDDEN','NO_CREDITS','GAME_CHANGED','INVALID_INPUT','UPLOAD_EXPIRED','INVALID_IMAGE','INVALID_MEDIA','FACE_REFERENCE_MISSING','FACE_REFERENCE_CHANGED','FACE_MISMATCH','FACE_UNAVAILABLE','EMBEDDING_UNAVAILABLE','MODEL_MISMATCH','MAIL_UNAVAILABLE','TEASE_UNAVAILABLE','TEASE_LIMIT'];
 const code=allowed.find(c=>message.includes(c))||'SERVER_ERROR';
 console.error('gift-api failure',code); // Never log answers, images, tokens or provider responses.
 return reply({error:code},code==='FORBIDDEN'?403:code==='SERVER_ERROR'||code==='EMBEDDING_UNAVAILABLE'||code==='MAIL_UNAVAILABLE'||code==='FACE_UNAVAILABLE'||code==='TEASE_UNAVAILABLE'?503:code==='TEASE_LIMIT'?429:400);
 }
});
