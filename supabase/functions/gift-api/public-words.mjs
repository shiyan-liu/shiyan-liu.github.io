const actions=new Set(['create','join','state','submit','start','history']);
export function publicWordInput(body){
 const action=typeof body.action==='string'?body.action.replace(/^public-word-/,''):'';
 if(!actions.has(action)||typeof body.code!=='string'||!/^[A-Za-z0-9_-]{12}$/.test(body.code)||typeof body.token!=='string'||!/^[a-f0-9]{64}$/.test(body.token))throw Error('INVALID_INPUT');
 const result={p_action:action,p_code:body.code,p_version:-1,p_game:null,p_round:null,p_word:null,p_before:null};
 if(body.version!==undefined){if(!Number.isSafeInteger(body.version)||body.version<0)throw Error('INVALID_INPUT');result.p_version=body.version;}
 if(body.gameId!==undefined){if(typeof body.gameId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.gameId))throw Error('INVALID_INPUT');result.p_game=body.gameId;}
 if(action==='start'&&!result.p_game)throw Error('INVALID_INPUT');
 if(action==='submit'){
  if(!result.p_game||!Number.isInteger(body.round)||body.round<1||body.round>100||typeof body.word!=='string'||!body.word.trim()||body.word.trim().length>80)throw Error('INVALID_INPUT');
  result.p_round=body.round;result.p_word=body.word.trim();
 }
 if(body.before!==undefined){if(typeof body.before!=='string'||!Number.isFinite(Date.parse(body.before)))throw Error('INVALID_INPUT');result.p_before=body.before;}
 return result;
}
export async function publicWordHandler(db,req,body,salt){
 try{
  const input=publicWordInput(body);
  const hash=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-real-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const ipHash=await hash(`${salt}:${ip}`);
  if(['create','join'].includes(input.p_action)){const rate=await db.rpc('open_word_entry_rate',{p_ip:ipHash,p_action:input.p_action});if(rate.error)throw rate.error;if(!rate.data)throw Error('RATE_LIMITED');}
  const result=await db.rpc('open_word_action',{...input,p_hash:await hash(body.token),p_ip:ipHash});
  if(result.error)throw result.error;
  return {status:200,data:result.data};
 }catch(e){const allowed=['INVALID_INPUT','RATE_LIMITED','ROOM_NOT_FOUND','ROOM_EXPIRED','ROOM_FULL','ROOM_AUTH','ROOM_LIMIT','GAME_CHANGED','ALREADY_SENT','WAIT_FOR_PARTNER'];const error=allowed.find(x=>String(e?.message||'').includes(x))||'SERVER_ERROR';return {status:error==='RATE_LIMITED'?429:error==='ROOM_AUTH'?403:error==='ROOM_NOT_FOUND'?404:error==='ROOM_EXPIRED'?410:error==='SERVER_ERROR'?503:400,data:{error}};}
}
