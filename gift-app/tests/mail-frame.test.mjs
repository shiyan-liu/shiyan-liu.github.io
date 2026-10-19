import test from 'node:test';
import assert from 'node:assert/strict';
import{mailFrame,plainMailHtml}from'../../supabase/functions/gift-api/mail-frame.mjs';
test('email frame uses a public PNG wallpaper and a readable inner card',()=>{
 const html=mailFrame('<p>给你的小纸条</p>');
 assert.match(html,/background="https:\/\/shiyanliu.com\/zz\/gift\/assets\/mood-hearts.png"/);
 assert.match(html,/background-repeat:repeat/);
 assert.match(html,/max-width:520px/);
 assert.match(html,/<p>给你的小纸条<\/p>/);
 assert.doesNotMatch(html,/data:image|\.svg/);
});
test('text-only emails become escaped HTML with working links',()=>{
 const html=plainMailHtml('你好 <script>\nhttps://shiyanliu.com/zz/gift/?a=1&b=2');
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/<br>/);
 assert.match(html,/href="https:\/\/shiyanliu.com\/zz\/gift\/\?a=1&amp;b=2"/);
 assert.doesNotMatch(html,/<script>/);
});
