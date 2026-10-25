import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicWordRound} from '../../supabase/functions/gift-api/word-game.mjs';
test('sealed rounds return readiness only, including archived partial rounds',()=>{
 for(const row of [{lsy_word:'秘密词',zz_word:null},{lsy_word:null,zz_word:'另一个秘密'},{lsy_word:'甲',zz_word:'乙'}]){
  const result=publicWordRound({round_no:1,revealed_at:null,...row});
  assert.equal(result.revealed,false);assert.equal('lsyWord' in result,false);assert.equal('zzWord' in result,false);
 }
});
test('both committed words are returned only after reveal',()=>{
 assert.deepEqual(publicWordRound({round_no:2,lsy_word:'月亮',zz_word:'星星',revealed_at:'2026-10-25'}),{number:2,lsySubmitted:true,zzSubmitted:true,revealed:true,lsyWord:'月亮',zzWord:'星星'});
});
test('even an inconsistent revealed timestamp cannot leak a partial round',()=>{
 const result=publicWordRound({round_no:3,lsy_word:'秘密',zz_word:null,revealed_at:'2026-10-25'});assert.equal(result.revealed,false);assert.equal('lsyWord' in result,false);
});
