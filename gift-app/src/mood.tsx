import React,{useEffect,useRef,useState} from 'react';
import {cfg,supabase} from './space-session';
import {ArrowLeft,Check,CheckCircle2,CloudRain,Heart,MailCheck,Moon,Smile,Sparkles,Flame,Coffee,HandHeart,Plus,ChevronUp,X} from 'lucide-react';

type Mood='sad'|'tired'|'anxious'|'miss_you'|'happy'|'angry'|'bored'|'hug';
type Letter={moods:Mood[];customMood:string;quote:string;close:string};
const moods:{id:Mood;title:string;detail:string;icon:React.ReactNode}[]=[
 {id:'happy',title:'今天好开心',detail:'快乐也想分你一半。',icon:<Smile/>},
 {id:'sad',title:'有点难过',detail:'今天可以不用坚强。',icon:<CloudRain/>},
 {id:'tired',title:'好累好累',detail:'辛苦的小朋友。',icon:<Moon/>},
 {id:'anxious',title:'有点焦虑',detail:'先一起吸口气。',icon:<Sparkles/>},
 {id:'miss_you',title:'想男朋友了',detail:'把想念寄出去。',icon:<Heart/>},
 {id:'angry',title:'有点小生气',detail:'小火苗，先放这里。',icon:<Flame/>},
 {id:'bored',title:'今天有点无聊',detail:'想给日子加点料。',icon:<Coffee/>},
 {id:'hug',title:'想要抱抱',detail:'想被好好抱一会儿。',icon:<HandHeart/>}
];
const groups:{id:'share'|'care';title:string;ids:Mood[]}[]=[
 {id:'share',title:'想和你分享',ids:['happy','hug','miss_you','bored']},
 {id:'care',title:'想被温柔接住',ids:['sad','tired','anxious','angry']}
];
const isMood=(value:string|null):value is Mood=>moods.some(m=>m.id===value);
const normalizeMood=(value:string):Mood|null=>value==='hurt'?'sad':value==='hopeful'?'hug':isMood(value)?value:null;
async function publicRequest(action:string,data:Record<string,unknown>={}){
 if(!cfg)throw Error('NOT_CONFIGURED');
 const r=await fetch(`${cfg.supabaseUrl}/functions/v1/gift-api`,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.publishableKey},body:JSON.stringify({action,...data})});
 const result=await r.json();if(!r.ok)throw Error(result.error||'SERVER_ERROR');return result;
}
async function request(action:string,data:Record<string,unknown>={}){
 if(!supabase||!cfg)throw Error('NOT_CONFIGURED');
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('UNAUTHORIZED');
 const r=await fetch(`${cfg.supabaseUrl}/functions/v1/gift-api`,{method:'POST',headers:{'Content-Type':'application/json',apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action,...data})});
 const result=await r.json();if(!r.ok)throw Error(result.error||'SERVER_ERROR');return result;
}
export function MoodApp(){
 const [ready,setReady]=useState(false),[loggedIn,setLoggedIn]=useState(false);
 const [draft,setDraft]=useState<Mood[]>(()=>[...new Set((new URLSearchParams(location.search).get('moods')||new URLSearchParams(location.search).get('mood')||'').split(',').map(normalizeMood).filter(isMood))]);
 const [customOpen,setCustomOpen]=useState(()=>new URLSearchParams(location.search).get('custom')==='1'),[customMood,setCustomMood]=useState('');
 const hasCustom=!!customMood.trim();
 const [letter,setLetter]=useState<Letter|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const emailStarted=useRef(false),emailToken=useRef(new URLSearchParams(location.search).get('token'));
 const [emailAccess,setEmailAccess]=useState(false),[emailPending,setEmailPending]=useState(!!emailToken.current);
 function complete(data:{quote?:string;close?:string;mailSent?:boolean},selected:Mood[],custom:string){
  if(!data.mailSent||!data.quote||!data.close)throw Error('MOOD_REPLY_UNAVAILABLE');
  setLetter({moods:selected,customMood:custom,quote:data.quote,close:data.close});setNotice('信已经寄出啦，记得看看邮箱。');
 }
 useEffect(()=>{if(!supabase){setReady(true);return;}supabase.auth.getSession().then(({data})=>{setLoggedIn(!!data.session);setReady(true);if(!data.session&&!emailToken.current)location.replace('/zz/?next=mood');});},[]);
 useEffect(()=>{
  const token=emailToken.current;if(!token||emailStarted.current){if(!token)setEmailPending(false);return;}
  emailStarted.current=true;
  publicRequest('mood-email-open',{token}).then(()=>{
   setEmailAccess(true);
   history.replaceState({},'',location.pathname);
  }).catch(()=>setError('这次没能打开小纸条。可以稍后重试，或回到小空间。')).finally(()=>setEmailPending(false));
 },[]);
 useEffect(()=>{if(!notice&&!error)return;const id=window.setTimeout(()=>{setNotice('');setError('');},6000);return()=>window.clearTimeout(id);},[notice,error]);
 async function sendSelection(e:React.FormEvent){
  e.preventDefault();if((!draft.length&&!hasCustom)||busy)return;setBusy(true);setError('');setNotice('');
  try{
   const data=emailToken.current&&emailAccess?await publicRequest('mood-email-select',{moods:draft,customMood:customMood.trim(),token:emailToken.current}):await request('mood-select',{moods:draft,customMood:customMood.trim()});
   complete(data,[...draft],customMood.trim());
  }catch(e){
   const message=String(e);
   setError(message.includes('MOOD_EMAIL_REQUIRED')?'先在惊喜页面留下并确认邮箱，才可以把这份心情好好送达。':message.includes('MOOD_REPLY_UNAVAILABLE')?'小纸条这次没写好，还没有寄信。稍后再试一次，好吗？':'这次没能把信送出去，稍后再试试。');
  }finally{setBusy(false);}
 }
  const content=<main className={`mood-shell ${letter?'mood-shell-confirmed':'mood-shell-picker'}`}>
  <a href="/zz/" className="back-link"><ArrowLeft size={15}/>回到小空间</a>
  <span className="mood-eyebrow">A SOFT PLACE TO LAND</span>
  {letter?<><section className="mood-letter" aria-labelledby="mood-letter-title">
   <span className="mood-letter-heart" aria-hidden="true">💗</span><h1 id="mood-letter-title">我看到啦</h1>
   <p>今天的你是：</p><div className="mood-letter-tags">{letter.moods.map(id=><span key={id} className={`mood-tag mood-tag-${groups.find(g=>g.ids.includes(id))!.id}`}>{moods.find(m=>m.id===id)!.title}</span>)}{letter.customMood&&<span className="mood-tag mood-tag-custom">{letter.customMood}</span>}</div>
   <blockquote className="mood-letter-quote">“{letter.quote}”</blockquote>
   <p className="mood-letter-close">{letter.close}<br/>我会在这里陪着你。💗</p>
   <p className="mood-letter-signature">最爱你的男朋友</p>
  </section><div className="mood-mail-status" role="status"><MailCheck size={19}/><div><strong>信已经寄出啦</strong><span>这份小心情也装进了邮件，记得看看邮箱。</span></div><CheckCircle2 size={16}/></div>
  <button className="mood-again" onClick={()=>{setLetter(null);setDraft([]);setCustomMood('');setCustomOpen(false);setNotice('');}}>再选一次</button></>:<>
   <h1>宝宝心情充电站</h1>
   <p className="mood-intro">无论今天怎么样，你都值得被爱。<br/><span>心情可以不止一种，选好后一起交给我。</span></p>
   <form onSubmit={sendSelection}>
    <section className="mood-groups" aria-label="今天的心情，可多选">
     {groups.map(group=><section key={group.id} className={`mood-group mood-group-${group.id}`} aria-labelledby={`mood-group-${group.id}`}><h2 id={`mood-group-${group.id}`}>{group.title}</h2><div className="mood-grid">{group.ids.map(id=>moods.find(m=>m.id===id)!).map(item=>{const selected=draft.includes(item.id);return <button type="button" key={item.id} className={`mood-choice ${selected?'selected':''}`} aria-pressed={selected} onClick={()=>setDraft(current=>selected?current.filter(id=>id!==item.id):[...current,item.id])} disabled={busy}>
      <span className="mood-choice-heading"><span className="mood-icon">{item.icon}</span><span className="mood-check" aria-hidden="true">{selected&&<Check size={12}/>}</span></span>
      <strong>{item.title}</strong><small>{item.detail}</small>
     </button>;})}</div></section>)}
    </section>
    {customOpen&&<div className="mood-custom-field"><label htmlFor="custom-mood">用自己的话说也可以</label><input id="custom-mood" value={customMood} onChange={e=>setCustomMood(e.target.value)} maxLength={160} placeholder="此刻的心情，想怎么说都可以…" disabled={busy} autoFocus/><small>{customMood.length}/160</small></div>}
    <div className="mood-send-row"><div className="mood-send-left"><button className="mood-custom-toggle" type="button" aria-expanded={customOpen} aria-controls="custom-mood" disabled={busy} onClick={()=>setCustomOpen(open=>!open)}>{customOpen?<ChevronUp size={12}/>:<Plus size={12}/>}自己写一句{!customOpen&&hasCustom&&' · 已写好'}</button><span aria-live="polite">{draft.length||hasCustom?`装好了 ${draft.length+(hasCustom?1:0)} 种小心情`:'也可以只写自己的心情'}</span></div><button className="mood-send" disabled={(!draft.length&&!hasCustom)||busy}>{busy?'写一小句话，寄给你…':'把心情寄给你'}<Heart size={14}/></button></div>
   </form>
   <p className="mood-foot">想选几次都可以；不想选时，什么都不用做。</p>
  </>}
 </main>;
 return <div className="mood-app"><header className="topbar"><a className="brand" href="/zz/"><span className="brand-mark">✳</span><span>shiyan's little corner</span></a><span className="topbar-note">a tiny place for us two ♡</span></header>
 {!ready||emailPending?<main className="mood-shell"><p role="status">正在为你打开充电站…</p></main>:loggedIn||letter||emailAccess?content:<main className="mood-shell mood-gate"><a href="/zz/" className="back-link"><ArrowLeft size={15}/>回到小空间</a><h1>宝宝心情充电站</h1><p>无论今天怎么样，你都值得被爱。</p><a className="back-link" href="/zz/?next=mood">回到小空间，对一下暗号 →</a></main>}
 {(notice||error)&&<div className={`toast ${error?'toast-error':''}`} role={error?'alert':'status'}><span>{notice||error}</span><button onClick={()=>{setNotice('');setError('')}} aria-label="关闭"><X size={16}/></button></div>}</div>;
}
