import test from 'node:test';
import assert from 'node:assert/strict';
import{parseMoods,moodQuoteRequest,validateMoodQuote,confirmationMail}from'../../supabase/functions/gift-api/mood-response.mjs';
test('multi selection validates and deduplicates without accepting object properties',()=>{
 assert.deepEqual(parseMoods(['happy','tired','happy']),['happy','tired']);
 assert.deepEqual(parseMoods('sad'),['sad']);
 for(const value of [[],['constructor'],['__proto__'],['nope'],null])assert.throws(()=>parseMoods(value));
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
 assert.match(confirmationMail(['hug'],quote+'<script>').html,/&lt;script&gt;/);
});
