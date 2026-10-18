import {moodOptions,moodGroups} from './mood-response.mjs';
const moodUrl='https://shiyanliu.com/zz/mood/';
export function reminderClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  return {date:`${value('year')}-${value('month')}-${value('day')}`,slot:Number(value('hour')) < 14 ? 'morning' : 'evening'};
}
export function reminderCopy(slot) {
  if (slot !== 'morning' && slot !== 'evening') throw Error('INVALID_INPUT');
  return slot === 'evening' ? {
    title:'傍晚啦，来我这里歇一会儿吧',
    intro:'今天走到这里，辛苦你啦。如果愿意，把此刻的一点心情交给我吧。开心也好，有点累也好，我都想轻轻接住。',
    close:'先好好吃饭，慢慢休息。今晚也有人把你放在心上。💗'
  } : {
    title:'早安呀，今天还好吗？',
    intro:'如果愿意的话，把今天的一点心情交给我吧。你不用把所有事情都说清楚，轻轻点一下就够了。',
    close:'我在这里，愿今天对你轻一点。💗'
  };
}
export function reminderHtml(token,slot){const copy=reminderCopy(slot);const buttons=moodGroups.map(group=>`<h2 style="font-size:12px;font-weight:500;color:${group.color};margin:18px 6px 3px">${group.label}</h2><table role="presentation" style="width:100%;table-layout:fixed;border-spacing:6px;margin:0 0 9px"><tbody>${[0,2].map(start=>'<tr>'+group.moods.slice(start,start+2).map(id=>`<td style="width:50%;padding:0"><a href="${moodUrl}?moods=${id}&token=${token}" style="display:block;padding:11px 12px;border:1px solid ${group.border};border-radius:9px;background:${group.background};color:${group.color};text-decoration:none;text-align:center;font-size:13px">${moodOptions[id].label}</a></td>`).join('')+'</tr>').join('')}</tbody></table>`).join('');return `<div style="max-width:520px;margin:auto;padding:30px 22px;background:#fffafd;color:#453840;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.7"><div style="font-size:28px;line-height:1;margin-bottom:12px">💗</div><h1 style="font-size:22px;font-weight:600;margin:0 0 16px">${copy.title}</h1><p>${copy.intro}</p><p style="font-size:13px;color:#957285">心情也可以不止一种。点开小空间后选好，再一起寄给我。</p>${buttons}<p style="margin-top:22px;color:#766670">如果今天不想选，也没关系。<br>不用回复，也不用解释。今天就按自己的节奏来。</p><p style="color:#766670">${copy.close}</p><p style="margin-top:26px;color:#8b6c7c">最爱你的男朋友</p></div>`;}
