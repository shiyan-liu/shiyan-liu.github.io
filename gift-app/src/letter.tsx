import React,{useEffect,useState} from 'react';
import {ArrowLeft,Heart,PenLine} from 'lucide-react';
import {supabase} from './space-session';
import {letterParagraphs} from './letter-content';
import './letter.css';

function Emphasis({text}:{text:string}){
 const parts=text.split(/(\*\*.*?\*\*)/g);
 return <>{parts.map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part)}</>;
}
export function LetterApp(){
 const [ready,setReady]=useState(false);
 useEffect(()=>{let alive=true;if(!supabase){location.replace('/zz/');return;}supabase.auth.getSession().then(({data})=>{if(!alive)return;if(!data.session){location.replace('/zz/?next=letter');return;}setReady(true);});const {data}=supabase.auth.onAuthStateChange((_event,session)=>{if(!session)location.replace('/zz/');});return()=>{alive=false;data.subscription.unsubscribe();};},[]);
 if(!ready)return <div className="letter-app"><main className="letter-page"><p role="status">正在把这封信展开…</p></main></div>;
 return <div className="letter-app"><header className="letter-nav"><a href="/zz/"><ArrowLeft size={16}/>回到小空间</a><span>给你的一封信 <Heart size={13} fill="currentColor"/></span></header><main className="letter-page"><div className="letter-heart-burst" aria-hidden="true">{Array.from({length:7},(_,i)=><span key={i}>♥</span>)}</div><div className="letter-kicker"><span>JUST FOR YOU</span><i>✿</i></div><h1>慢慢来，我陪你</h1><p className="letter-deck">关于秋招，也关于我们想一起过的生活</p><div className="letter-divider"><span>♡</span></div><p className="letter-salutation">亲爱的：</p><article className="letter-body">{letterParagraphs.map((paragraph,index)=><p key={index}><Emphasis text={paragraph}/></p>)}</article><footer className="letter-signoff"><span>不必一个人着急，</span><strong>我一直和你站在一起。</strong><i>一直站在你这边的我 <Heart size={14} fill="currentColor"/></i></footer><a className="letter-back" href="/zz/"><PenLine size={14}/>把这封信收好，回小空间看看</a></main><div className="letter-bottom-note">写给你的一点温柔 <span>♡</span></div></div>;
}
