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
