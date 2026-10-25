import {test} from 'node:test';
import assert from 'node:assert/strict';
import {publicWordInput,publicWordHandler} from '../../supabase/functions/gift-api/public-words.mjs';
const base={action:'public-word-state',code:'AbCd1234_-ef',token:'a'.repeat(64)};
test('room capabilities reject missing/malformed credentials and private actions',()=>{
 for(const body of [{...base,token:''},{...base,code:'123456'},{...base,action:'word-state'},{...base,action:'public-word-drop'},{...base,version:-1},{...base,gameId:'oops'}])assert.throws(()=>publicWordInput(body),/INVALID_INPUT/);
});
test('validated public input cannot choose its own seat or inject a hash',()=>{
 const r=publicWordInput({...base,seat:'a',p_hash:'stolen',version:3});assert.equal(r.p_action,'state');assert.equal(r.p_version,3);assert.equal('seat' in r,false);assert.equal('p_hash' in r,false);
});
test('word and round limits apply before database calls',()=>{
 const submit={...base,action:'public-word-submit',gameId:'12345678-1234-4234-8234-123456789abc',round:1,word:' 月亮 '};assert.equal(publicWordInput(submit).p_word,'月亮');
 for(const data of [{word:''},{word:'x'.repeat(81)},{round:101},{round:0},{round:1.5}])assert.throws(()=>publicWordInput({...submit,...data}),/INVALID_INPUT/);
});
test('entry rate failure prevents room creation; token sent only as digest',async()=>{
 const calls=[];const db={rpc:async(name,args)=>{calls.push({name,args});return name==='open_word_entry_rate'?{data:false,error:null}:{data:{},error:null};}};
 const result=await publicWordHandler(db,new Request('https://example.com'),{...base,action:'public-word-create'},'salt');assert.equal(result.status,429);assert.equal(calls.length,1);assert.equal(calls[0].args.p_ip.length,64);
 const stateCalls=[];const state=await publicWordHandler({rpc:async(name,args)=>{stateCalls.push({name,args});return {data:{unchanged:true},error:null};}},new Request('https://example.com'),base,'salt');assert.equal(state.status,200);assert.equal(stateCalls[0].name,'open_word_action');assert.equal(stateCalls[0].args.p_hash.length,64);assert.notEqual(stateCalls[0].args.p_hash,base.token);assert.equal(JSON.stringify(stateCalls).includes(base.token),false);
});
