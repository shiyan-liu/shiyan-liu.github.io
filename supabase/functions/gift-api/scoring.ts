export function normalize(text: string) {
  return text.normalize('NFKC').toLocaleLowerCase('en-US').replace(/[\s\p{P}\p{S}]/gu, '');
}
export function similarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length || [...a,...b].some(x => !Number.isFinite(x))) throw new Error('MODEL_MISMATCH');
  const dot = a.reduce((s,x,i)=>s+x*b[i],0);
  const norm = Math.sqrt(a.reduce((s,x)=>s+x*x,0)*b.reduce((s,x)=>s+x*x,0));
  if (!norm) throw new Error('MODEL_MISMATCH');
  // A fixed monotonic hint scale, not a probability. Exact aliases alone score 100.
  return Math.round(Math.min(99,Math.max(0,(dot/norm-0.15)/0.75*99))*100)/100;
}
