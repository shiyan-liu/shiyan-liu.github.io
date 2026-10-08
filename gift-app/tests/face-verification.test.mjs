import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVerification,verificationRequest,validateMedia} from '../../supabase/functions/gift-api/face-verification.mjs';

test('rejects ambiguous, nonmatching and low-score mock verdicts',()=>{
  for(const verdict of [{match:false,confidence:1,face_count:1},{match:true,confidence:.89,face_count:1},{match:true,confidence:1,face_count:2},{match:true,confidence:1,face_count:0}])
    assert.throws(()=>parseVerification(JSON.stringify(verdict)),/FACE_MISMATCH/);
});
test('malformed or coerced provider results never authorize storage',()=>{
  for(const raw of ['{}','null','{"match":true,"confidence":"0.99","face_count":1}','{"match":true,"confidence":1.1,"face_count":1}','not JSON'])
    assert.throws(()=>parseVerification(raw),/FACE_UNAVAILABLE/);
  assert.deepEqual(parseVerification('{"match":true,"confidence":0.95,"face_count":1}'),{confidence:.95});
});
test('request uses actual media and disables provider fallback',()=>{
  const request=verificationRequest('configured/model','mock-reference','mock-video','video/mp4');
  assert.equal(request.model,'configured/model');
  assert.equal(request.provider.allow_fallbacks,false);
  assert.deepEqual(request.messages[1].content[1],{type:'video_url',video_url:{url:'mock-video'}});
  assert.throws(()=>verificationRequest('','a','b','image/jpeg'),/FACE_UNAVAILABLE/);
});
test('rejects mislabeled images and oversized video before provider request',()=>{
  assert.throws(()=>validateMedia(new Uint8Array(32),'image/jpeg'),/INVALID_MEDIA/);
  const jpeg=new Uint8Array(32);jpeg.set([255,216,255]);validateMedia(jpeg,'image/jpeg');
  assert.throws(()=>validateMedia(jpeg,'video/mp4'),/INVALID_MEDIA/);
  assert.throws(()=>validateMedia(new Uint8Array(10*1024*1024+1),'video/webm'),/INVALID_MEDIA/);
});
