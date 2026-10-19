const wallpaper='https://shiyanliu.com/zz/gift/assets/mood-hearts.png';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function plainMailHtml(text){
 const content=escape(text).replace(/https:\/\/[^\s<]+/g,url=>`<a href="${url}" style="color:#99768a;word-break:break-word">${url}</a>`).replace(/\n/g,'<br>');
 return `<div style="max-width:520px;margin:auto;padding:30px 22px;background:#fffafd;color:#453840;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.8">${content}</div>`;
}

export function mailFrame(html){
 return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" background="${wallpaper}" style="width:100%;background-color:#fff;background-image:url('${wallpaper}');background-repeat:repeat;background-size:320px 320px"><tr><td align="center" style="padding:30px 16px"><table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px;background:#fffafd;border:1px solid #ecdfe6;border-radius:14px"><tr><td style="padding:0"><div style="border-radius:13px;overflow:hidden">${html}</div></td></tr></table></td></tr></table>`;
}
