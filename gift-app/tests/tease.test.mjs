import test from 'node:test';
import assert from 'node:assert/strict';
import {teaseRequest,validateClue,validateTease} from '../../supabase/functions/gift-api/tease.mjs';
test('the actual gift context reaches the model without a manual clue',()=>{
  const request=teaseRequest('拜托啦🥺',{title:'一份惊喜',answer:'巧克力'});
  assert.equal(request.provider.allow_fallbacks,false);
  assert.equal(request.reasoning.enabled,false);
  assert.deepEqual(JSON.parse(request.messages[1].content),{gift_context:{title:'一份惊喜',answer:'巧克力'},interaction:'拜托啦🥺'});
});
test('literal answer and alias disclosures are rejected despite punctuation',()=>{
  assert.throws(()=>validateClue('就是巧，克，力。','巧克力'),/CLUE_TOO_CLEAR/);
  assert.throws(()=>validateTease('送你一台相机。','拍立得',['相机']),/TEASE_UNAVAILABLE/);
  assert.equal(validateClue('普通的一天也可以变特别。','巧克力'),'普通的一天也可以变特别。');
});
test('empty or runaway replies fail closed',()=>{
  for(const raw of [null,'','x'.repeat(181)])assert.throws(()=>validateTease(raw,'礼物'),/TEASE_UNAVAILABLE/);
  assert.equal(validateTease('你再眨眨眼，礼物盒都快心软了。','巧克力'),'你再眨眨眼，礼物盒都快心软了。');
});
