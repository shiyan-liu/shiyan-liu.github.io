export const moodOptions = {
  sad:{label:'有点难过'}, tired:{label:'好累好累'}, anxious:{label:'有点焦虑'},
  miss_you:{label:'想男朋友了'}, happy:{label:'今天好开心'},
  hurt:{label:'有点小委屈'}, hug:{label:'想要抱抱'}
};
export function parseMoods(value) {
  const values=Array.isArray(value)?value:[value];
  if(!values.length||values.length>7||values.some(x=>typeof x!=='string'||!Object.hasOwn(moodOptions,x)))throw Error('INVALID_MOOD');
  return [...new Set(values)];
}
export function moodQuoteRequest(values,model='qwen/qwen3.5-flash-02-23') {
  const moods=parseMoods(values);
  return {model,provider:{allow_fallbacks:false,require_parameters:true},reasoning:{enabled:false},temperature:0.85,max_tokens:240,messages:[
    {role:'system',content:'你在替男朋友写给女朋友的一句贴心的话。只输出一句28到85个中文字的正文，不加标题、引号、emoji或解释。直接用第二人称“你”对她说话，可以用“我”表达男朋友的陪伴，绝不能用“她”“您”“用户”。结合下方全部心情，自然地承认同时存在的感受，不逐项复述标签。只有开心时就分享她的快乐，别无端说她难过；快乐和疲惫并存时允许两者同时存在。温馨、亲密、具体、朴素，像一个熟悉她的男朋友，少用说教和空洞套话，不诊断、不许诺解决所有事、不猜测没有提供的经历。不强迫她回复、解释、乐观或立刻好起来。只写这句心情相关的话，其他问候、落款已有固定模板。'},
    {role:'user',content:JSON.stringify({今天此刻的心情:moods.map(x=>moodOptions[x].label)})}
  ]};
}
export function validateMoodQuote(raw) {
  if(typeof raw!=='string')throw Error('MOOD_REPLY_UNAVAILABLE');
  const quote=raw.trim().replace(/^[“「"]|[”」"]$/g,'');
  if(quote.length<20||quote.length>150||!quote.includes('你')||/[\r\n]|\p{Extended_Pictographic}/u.test(quote)||/用户|作为AI|作为一个|她|您/.test(quote))throw Error('MOOD_REPLY_UNAVAILABLE');
  return quote;
}
export const needsComfort=values=>values.some(x=>['sad','tired','anxious','hurt'].includes(x));
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function confirmationMail(values,rawQuote) {
  const moods=parseMoods(values),quote=validateMoodQuote(rawQuote),labels=moods.map(x=>moodOptions[x].label).join('、');
  const close=needsComfort(moods)?'不用急着变好，也不用急着说什么。':'开心也好，想撒娇也好，都可以慢慢告诉我。';
  return {labels,quote,close,subject:'我收到你今天的小心情了 💗',
    text:`我看到啦。\n\n今天的你是「${labels}」。\n\n“${quote}”\n\n${close}我会在这里陪着你。\n\n最爱你的男朋友`,
    html:`<div style="max-width:520px;margin:auto;padding:30px 22px;background:#fffafd;color:#453840;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7"><div style="font-size:28px;line-height:1;margin-bottom:12px">💗</div><h1 style="font-size:22px;font-weight:600;margin:0 0 16px">我看到啦</h1><p>今天的你是「${escape(labels)}」。</p><blockquote style="margin:24px 0;padding:20px 22px;background:#f8eaf1;border-left:3px solid #cb8dab;border-radius:0 10px 10px 0;color:#995376;font-size:18px;font-weight:500;line-height:1.9">“${escape(quote)}”</blockquote><p style="color:#766670">${close}<br>我会在这里陪着你。💗</p><p style="margin-top:26px;color:#8b6c7c">最爱你的男朋友</p></div>`};
}
