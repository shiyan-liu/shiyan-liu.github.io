// Never return a submitted word until BOTH words have been committed and revealed.
export function publicWordRound(row){
 const revealed=!!row.revealed_at&&typeof row.lsy_word==='string'&&typeof row.zz_word==='string';
 return {number:row.round_no,lsySubmitted:typeof row.lsy_word==='string',zzSubmitted:typeof row.zz_word==='string',revealed,...(revealed?{lsyWord:row.lsy_word,zzWord:row.zz_word}: {})};
}
