import React,{useEffect,useRef,useState} from 'react';
import {cfg,supabase} from './space-session';
import {MoodBloom} from './MoodBloom';
import {ArrowLeft,Check,CheckCircle2,CloudRain,Heart,MailCheck,Moon,Smile,Sparkles,Flame,Coffee,HandHeart,Plus,ChevronUp,X} from 'lucide-react';

type Mood='sad'|'tired'|'anxious'|'miss_you'|'happy'|'angry'|'bored'|'hug';
type Letter={id:string;version:number;moods:Mood[];customMood:string;quote:string;close:string;choices:string[];mailSent:boolean};
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
 const r=await fetch(`${cfg.supabaseUrl}/functions/v1/gift-api`,{method:'POST',signal:AbortSignal.timeout(65000),headers:{'Content-Type':'application/json',apikey:cfg.publishableKey},body:JSON.stringify({action,...data})});
 const result=await r.json();if(!r.ok)throw Error(result.error||'SERVER_ERROR');return result;
}
async function request(action:string,data:Record<string,unknown>={}){
 if(!supabase||!cfg)throw Error('NOT_CONFIGURED');
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('UNAUTHORIZED');
 const r=await fetch(`${cfg.supabaseUrl}/functions/v1/gift-api`,{method:'POST',signal:AbortSignal.timeout(65000),headers:{'Content-Type':'application/json',apikey:cfg.publishableKey,Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action,...data})});
 const result=await r.json();if(!r.ok)throw Error(result.error||'SERVER_ERROR');return result;
}
export function MoodApp(){
 const [ready,setReady]=useState(false),[loggedIn,setLoggedIn]=useState(false);
 const [draft,setDraft]=useState<Mood[]>(()=>[...new Set((new URLSearchParams(location.search).get('moods')||new URLSearchParams(location.search).get('mood')||'').split(',').map(normalizeMood).filter(isMood))]);
 const [customOpen,setCustomOpen]=useState(()=>new URLSearchParams(location.search).get('custom')==='1'),[customMood,setCustomMood]=useState('');
 const hasCustom=!!customMood.trim();
 const [message,setMessage]=useState(''),[pastReplies,setPastReplies]=useState<{message:string;quote:string}[]>([]);
 const [letter,setLetter]=useState<Letter|null>(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const emailStarted=useRef(false),emailToken=useRef(new URLSearchParams(location.search).get('token'));
 const [emailAccess,setEmailAccess]=useState(false),[emailPending,setEmailPending]=useState(!!emailToken.current);
 function complete(data:Letter){if(!data.quote||!data.id||!Array.isArray(data.choices))throw Error('MOOD_REPLY_UNAVAILABLE');setLetter(data);}
 async function talk(action:string,data:Record<string,unknown>={}){return emailToken.current&&emailAccess?publicRequest(action,{...data,token:emailToken.current}):request(action,data);}
 function talkError(e:unknown){const value=String(e);return value.includes('MOOD_EMAIL_REQUIRED')?'先留下并确认邮箱，就能把喜欢的这句寄给你。':value.includes('MOOD_TALK_EXPIRED')?'这张小纸条先收起来了，重新选一下心情，我们再接着说。':value.includes('MOOD_TALK_CHANGED')?'另一张页面刚刚接了话，重新选一次心情再来吧。':value.includes('RATE_LIMITED')?'小纸条写得有点快，等一分钟再接着说。':value.includes('MAIL_UNAVAILABLE')?'信这次没寄出去，喜欢的这句还在这里，可以再试一次。':'小纸条刚刚没写好，还没有寄信，点一下再试试。';}
 async function continueTalk(text='',tone=''){if(!letter||busy||(!text.trim()&&!tone))return;setBusy(true);setError('');try{const next=await talk('mood-talk-reply',{id:letter.id,version:letter.version,message:text.trim(),tone});setPastReplies(items=>[...items,{message:tone?({softer:'太肉麻了',biased:'再偏心我一点',sincere:'认真说一句',again:'换个说法'} as Record<string,string>)[tone]:text.trim(),quote:letter.quote}].slice(-4));complete(next);setMessage('');}catch(e){setError(talkError(e));}finally{setBusy(false);}}
 async function keepLetter(){if(!letter||busy||letter.mailSent)return;setBusy(true);setError('');try{complete(await talk('mood-talk-save',{id:letter.id,version:letter.version}));setNotice('你挑中的这句话，已经装进信里啦。');}catch(e){setError(talkError(e));}finally{setBusy(false);}}
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
   const data=await talk('mood-talk-start',{moods:draft,customMood:customMood.trim()});
   complete(data);setPastReplies([]);setMessage('');
  }catch(e){setError(talkError(e));
  }finally{setBusy(false);}
 }
  const content=<main className={`mood-shell ${letter?'mood-shell-confirmed':'mood-shell-picker'}`}>
  <a href="/zz/" className="back-link"><ArrowLeft size={15}/>回到小空间</a>
  <span className="mood-eyebrow">A SOFT PLACE TO LAND</span>
  {letter?<><section className="mood-letter" aria-labelledby="mood-letter-title">
   <span className="mood-letter-heart" aria-hidden="true">💗</span><h1 id="mood-letter-title">再靠近一点点</h1>
   <p>今天的你是：</p><div className="mood-letter-tags">{letter.moods.map(id=><span key={id} className={`mood-tag mood-tag-${groups.find(g=>g.ids.includes(id))!.id}`}>{moods.find(m=>m.id===id)!.title}</span>)}{letter.customMood&&<span className="mood-tag mood-tag-custom">{letter.customMood}</span>}</div>
   {pastReplies.length>0&&<details className="mood-talk-past"><summary>刚才说到这里 · {pastReplies.length} 句</summary>{pastReplies.map((item,i)=><div key={i}><p>{item.quote}</p><small>你：{item.message}</small></div>)}</details>}
   <blockquote className={`mood-letter-quote ${busy?'is-writing':''}`} aria-live="polite">“{letter.quote}”</blockquote>
   <div className="mood-talk-choices" aria-label="接一句话">{letter.choices.map(choice=><button type="button" key={choice} disabled={busy} onClick={()=>void continueTalk(choice)}>{choice}</button>)}</div>
   <form className="mood-talk-form" onSubmit={e=>{e.preventDefault();void continueTalk(message);}}><label htmlFor="mood-talk-message">也可以自己接一句</label><div><input id="mood-talk-message" value={message} onChange={e=>setMessage(e.target.value)} maxLength={160} placeholder="都不是，就是想你了…" disabled={busy}/><button disabled={busy||!message.trim()}>{busy?'写着呢…':'递给你'}</button></div></form>
   <div className="mood-talk-tools"><details><summary>换个口吻</summary><div className="mood-talk-tones">{[['softer','太肉麻了'],['biased','再偏心我一点'],['sincere','认真说一句'],['again','这个不算，重来']].map(([tone,label])=><button key={tone} disabled={busy} onClick={()=>void continueTalk('',tone)}>{label}</button>)}</div></details><button className="mood-talk-save" disabled={busy||letter.mailSent} onClick={()=>void keepLetter()}><MailCheck size={14}/>{letter.mailSent?'这句已经寄好':'把这句收好 · 寄给我'}</button></div>
   <p className="mood-letter-close">时差里的想念，也可以慢慢说。</p>
   <p className="mood-letter-signature">最爱你的男朋友</p>
  </section>{letter.mailSent&&<div className="mood-mail-status" role="status"><MailCheck size={19}/><div><strong>信已经寄出啦</strong><span>你选中的这一句已经装进邮件，其他接话不会逐条寄信。</span></div><CheckCircle2 size={16}/></div>}
  <button className="mood-again" disabled={busy} onClick={()=>{setLetter(null);setDraft([]);setCustomMood('');setCustomOpen(false);setNotice('');setPastReplies([]);setMessage('');}}>再选一次</button></>:<>
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
    <div className="mood-send-row"><div className="mood-send-left"><button className="mood-custom-toggle" type="button" aria-expanded={customOpen} aria-controls="custom-mood" disabled={busy} onClick={()=>setCustomOpen(open=>!open)}>{customOpen?<ChevronUp size={12}/>:<Plus size={12}/>}自己写一句{!customOpen&&hasCustom&&' · 已写好'}</button><span aria-live="polite">{draft.length||hasCustom?`装好了 ${draft.length+(hasCustom?1:0)} 种小心情`:'也可以只写自己的心情'}</span></div><button className="mood-send" disabled={(!draft.length&&!hasCustom)||busy}>{busy?'写一张小纸条…':'看看你会怎么说'}<Heart size={14}/></button></div>
   </form>
   <p className="mood-foot">先说说话，喜欢哪一句再寄信。想选几次都可以，不想选也没关系。</p>
  </>}
 </main>;
 return <div className={`mood-app ${letter?'mood-app-letter':''}`}><header className="topbar"><a className="brand" href="/zz/"><span className="brand-mark">✳</span><span>shiyan's little corner</span></a><span className="topbar-note">a tiny place for us two ♡</span></header>
 {letter&&<MoodBloom/>}
 {!ready||emailPending?<main className="mood-shell"><p role="status">正在为你打开充电站…</p></main>:loggedIn||letter||emailAccess?content:<main className="mood-shell mood-gate"><a href="/zz/" className="back-link"><ArrowLeft size={15}/>回到小空间</a><h1>宝宝心情充电站</h1><p>无论今天怎么样，你都值得被爱。</p><a className="back-link" href="/zz/?next=mood">回到小空间，对一下暗号 →</a></main>}
 {(notice||error)&&<div className={`toast ${error?'toast-error':''}`} role={error?'alert':'status'}><span>{notice||error}</span><button onClick={()=>{setNotice('');setError('')}} aria-label="关闭"><X size={16}/></button></div>}</div>;
}
