import test from 'node:test';import assert from 'node:assert/strict';
import {talkRequest,validateTalk,tooSimilar} from '../../supabase/functions/gift-api/mood-talk.mjs';
const quote='你想我的时候，可以先把旁边那个位置留给我，今天想让我陪你随便聊两句，还是一起想想下次吃什么？';
test('conversation carries moods, actual followup and automatically maintained memory',()=>{
 const input=talkRequest({moods:['miss_you','tired'],customMood:'想一起吃饭',text:'都不是，就是想你',tone:'biased',memory:{content:'想吃火锅',updated_at:'2026-10-24'},messages:[{role:'user',text:'你猜'}],recent:[quote],model:'model'});
 assert.equal(input.provider.allow_fallbacks,false);const context=JSON.parse(input.messages[1].content);assert.equal(context.她刚才说,'都不是，就是想你');assert.match(context.心情.join(','),/想男朋友了/);assert.equal(context.长期记忆.content,'想吃火锅');assert.equal(context.最近用过请避开[0],quote);assert.match(input.messages[0].content,/不能声称男朋友此刻在线/);
 assert.throws(()=>talkRequest({moods:['happy'],tone:'constructor'}));
});
test('structured replies must offer three different short continuations and avoid repeated quotes',()=>{
 const raw=JSON.stringify({reply:quote,choices:['就想赖着你','下次吃火锅','你猜猜看'],memory:[]});assert.equal(validateTalk(raw).choices.length,3);assert.throws(()=>validateTalk(raw,[quote]));assert(tooSimilar(quote,quote+'！'));
 for(const choices of [['你猜'],['你猜','你猜','抱抱我'],['你猜','抱抱我','😀']])assert.throws(()=>validateTalk(JSON.stringify({reply:quote,choices})));
 assert.throws(()=>validateTalk('not json'));
 assert.throws(()=>validateTalk(JSON.stringify({reply:quote,choices:['你猜猜','抱一下','聊点什么'],memory:['一起吃过火锅']}),[],['我喜欢火锅']));
 assert.equal(validateTalk(JSON.stringify({reply:quote,choices:['你猜猜','抱一下','聊点什么'],memory:['我喜欢火锅']}),[],['我喜欢火锅']).memory,'["我喜欢火锅"]');
 assert.throws(()=>validateTalk(JSON.stringify({reply:'你突然说想我，窗外风很轻，我现在就想马上到你身边陪你说说话。',choices:['你猜猜','抱一下','聊点什么']})));
});
