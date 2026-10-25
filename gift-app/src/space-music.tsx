import React,{useEffect,useRef,useState} from 'react';
import {Music2,Volume2,VolumeX} from 'lucide-react';
import './space-music.css';
const preferenceKey='zz-bgm-enabled',positionKey='zz-bgm-position';
const source='/zz/audio/wo-ai-ni.m4a';
function preference(){try{return localStorage.getItem(preferenceKey)==='on';}catch{return false;}}
export function SpaceMusic(){
 const audio=useRef<HTMLAudioElement|null>(null),enabled=useRef(preference()),restored=useRef(false),lastSaved=useRef(0),attempt=useRef(0);
 const [playing,setPlaying]=useState(false),[loading,setLoading]=useState(false),[needsGesture,setNeedsGesture]=useState(false),[error,setError]=useState('');
 function savePosition(){const a=audio.current;if(!a||!restored.current||a.readyState<1||!Number.isFinite(a.currentTime))return;try{sessionStorage.setItem(positionKey,String(a.currentTime));}catch{}}
 function remember(on:boolean){enabled.current=on;try{localStorage.setItem(preferenceKey,on?'on':'off');}catch{}}
 async function play(){const a=audio.current;if(!a)return;const id=++attempt.current;setLoading(true);setError('');setNeedsGesture(false);try{await a.play();if(id!==attempt.current)return;remember(true);setPlaying(true);}catch(e){if(id!==attempt.current)return;setPlaying(false);if(e instanceof DOMException&&e.name==='NotAllowedError'){setNeedsGesture(true);}else{setError('音乐暂时没连上，点一下再试试。');}}finally{if(id===attempt.current)setLoading(false);}}
 function toggle(){if(playing||loading){++attempt.current;audio.current?.pause();savePosition();remember(false);setLoading(false);setPlaying(false);setNeedsGesture(false);setError('');}else void play();}
 useEffect(()=>{const a=audio.current;if(!a)return;a.volume=.25;if(enabled.current)void play();const leave=()=>{savePosition();++attempt.current;a.pause();};const resume=()=>{if(enabled.current)void play();};window.addEventListener('pagehide',leave);window.addEventListener('pageshow',resume);return()=>{savePosition();++attempt.current;a.pause();window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',resume);};},[]);
 useEffect(()=>{if(!error)return;const timer=setTimeout(()=>setError(''),6000);return()=>clearTimeout(timer);},[error]);
 return <><audio ref={audio} src={source} preload="none" loop onLoadedMetadata={()=>{const a=audio.current;if(!a||restored.current)return;restored.current=true;try{const position=Number(sessionStorage.getItem(positionKey));if(position>0&&Number.isFinite(a.duration)&&position<a.duration)a.currentTime=position;}catch{}}} onTimeUpdate={()=>{if(Date.now()-lastSaved.current>1000){savePosition();lastSaved.current=Date.now();}}} onPlaying={()=>{setPlaying(true);setLoading(false);setNeedsGesture(false);}} onPause={()=>setPlaying(false)} onError={()=>{++attempt.current;setPlaying(false);setLoading(false);setError('音乐暂时没连上，点一下再试试。');}}/>
 <div className="space-music"><button type="button" className={playing?'is-playing':''} onClick={toggle} aria-pressed={playing} aria-label={playing?'关闭背景音乐：S.H.E《我爱你》':loading?'取消加载背景音乐':'开启背景音乐：S.H.E《我爱你》'}><Music2 size={14}/><span><strong>我爱你 <small>· S.H.E</small></strong><small>{loading?'正在轻轻响起…':playing?'陪你慢慢逛':needsGesture?'点一下，继续听':'点一下，听首歌'}</small></span>{playing?<Volume2 size={14}/>:<VolumeX size={14}/>}</button></div>{error&&<div className="space-music-error" role="status">{error}</div>}</>;
}
