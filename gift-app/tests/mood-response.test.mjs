import test from 'node:test';
import assert from 'node:assert/strict';
import{moodGroups,moodOptions,parseMoodSelection,parseMoods,moodQuoteRequest,validateMoodQuote,confirmationMail}from'../../supabase/functions/gift-api/mood-response.mjs';
test('eight distinct options are divided into two complete groups of four',()=>{
 const ids=moodGroups.flatMap(group=>group.moods);
 assert.deepEqual(moodGroups.map(group=>group.moods.length),[4,4]);
 assert.equal(new Set(ids).size,8);
 assert.deepEqual([...ids].sort(),Object.keys(moodOptions).sort());
 assert.notEqual(moodGroups[0].background,moodGroups[1].background);
});
test('multi selection validates and deduplicates without accepting object properties',()=>{
 assert.deepEqual(parseMoods(['happy','tired','happy']),['happy','tired']);
 assert.deepEqual(parseMoods('sad'),['sad']);
 assert.deepEqual(parseMoods(['hurt','hopeful']),['sad','hug']);
 for(const value of [[],['constructor'],['__proto__'],['nope'],null])assert.throws(()=>parseMoods(value));
});
test('custom mood works alone or with presets and is validated before model calls',()=>{
 assert.deepEqual(parseMoodSelection([],'  想出去散散步  '),{moods:[],customMood:'想出去散散步'});
 assert.deepEqual(parseMoodSelection(['hug'],'今天\n想被陪着'),{moods:['hug'],customMood:'今天 想被陪着'});
 for(const custom of [' '.repeat(3),'字'.repeat(161),42,{mood:'hi'}])assert.throws(()=>parseMoodSelection([],custom));
 assert.match(moodQuoteRequest([],undefined,'有点想家，想听你说说话').messages[1].content,/有点想家，想听你说说话/);
 const quote='你想家的时候不必一个人扛着，想说什么都可以慢慢告诉我，我愿意陪你多聊一会儿。';
 assert.match(confirmationMail([],quote,'有点想家<script>').html,/有点想家&lt;script&gt;/);
 assert.equal(confirmationMail([],quote,'有点想家').labels,'有点想家');
});
test('all selected moods reach the model and no fallback is enabled',()=>{
 const request=moodQuoteRequest(['happy','tired','hug']);
 assert.match(request.messages[1].content,/今天好开心/);assert.match(request.messages[1].content,/好累好累/);assert.match(request.messages[1].content,/想要抱抱/);
 assert.equal(request.provider.allow_fallbacks,false);
});
test('template highlights a real second-person quote and keeps the signature',()=>{
 const quote='你可以把今天的开心揣进口袋，也把累的那一半交给我，回到我这里就先歇一会儿。';
 const mail=confirmationMail(['happy','tired'],quote);
 assert.equal(mail.quote,quote);assert.match(mail.html,/<blockquote/);assert.match(mail.html,/最爱你的男朋友/);assert.match(mail.labels,/今天好开心、好累好累/);
 assert.doesNotMatch(confirmationMail(['happy'],quote).close,/变好/);
 assert.throws(()=>validateMoodQuote('她今天辛苦了'));assert.throws(()=>validateMoodQuote(''));assert.throws(()=>validateMoodQuote(quote+'\n其他内容'));
 assert.match(confirmationMail(['miss_you'],quote+'<script>').html,/&lt;script&gt;/);
});
