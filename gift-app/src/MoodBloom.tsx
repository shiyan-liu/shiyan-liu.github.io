import React,{useEffect,useState} from 'react';
import {Heart} from 'lucide-react';
import './mood-bloom.css';

const petals=[[0,-190],[95,-165],[165,-95],[190,0],[165,95],[95,165],[0,190],[-95,165],[-165,95],[-190,0],[-165,-95],[-95,-165]];

export function MoodBloom(){
 const [visible,setVisible]=useState(true);
 useEffect(()=>{const timer=window.setTimeout(()=>setVisible(false),2000);return()=>window.clearTimeout(timer);},[]);
 if(!visible)return null;
 return <div className="mood-bloom" aria-hidden="true">
  <span className="mood-bloom-ring"/>
  <Heart className="mood-bloom-center" fill="currentColor" strokeWidth={1}/>
  {petals.map(([x,y],i)=><Heart key={i} className="mood-bloom-petal" fill="currentColor" strokeWidth={1} style={{'--bloom-x':`${x}px`,'--bloom-y':`${y}px`,'--bloom-delay':`${i*20}ms`,'--bloom-turn':`${i%2?18:-18}deg`} as React.CSSProperties}/>)}
 </div>;
}
