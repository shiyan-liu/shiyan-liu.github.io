import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MoodBloom} from './MoodBloom';

function BloomDemo(){
 const [run,setRun]=useState(0),[playing,setPlaying]=useState(false);
 useEffect(()=>{if(!playing)return;const timer=window.setTimeout(()=>setPlaying(false),2000);return()=>window.clearTimeout(timer);},[playing]);
 return <main className="bloom-demo"><button onClick={()=>{setRun(count=>count+1);setPlaying(true);}} disabled={playing}>播放爱心绽放</button>{playing&&<MoodBloom key={run}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<BloomDemo/>);
