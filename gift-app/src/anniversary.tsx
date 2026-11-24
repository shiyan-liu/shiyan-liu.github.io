import {useEffect, useState, type CSSProperties} from 'react';
import {ArrowLeft, Gift, Heart, RotateCcw, Sparkles} from 'lucide-react';
import {supabase} from './space-session';
import './anniversary.css';

const glints = [
  [-114, -102, 15, '✦'], [-78, -149, 90, '✧'], [33, -163, 120, '✦'],
  [108, -111, 210, '✧'], [133, -48, 90, '♡'], [112, 26, 180, '✦'],
  [-135, -18, 160, '♡'], [-50, -95, 100, '✧'], [67, -97, 250, '✦'],
] as const;

export function AnniversaryApp() {
  const [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!supabase) {
      location.replace('/zz/');
      return;
    }
    let active = true;
    void supabase.auth.getSession().then(({data}) => {
      if (!active) return;
      if (data.session) setReady(true);
      else location.replace('/zz/?next=anniversary');
    });
    const {data} = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && !session) location.replace('/zz/?next=anniversary');
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return <main className="anniversary-app anniversary-loading" role="status">正在取出你的小礼物…</main>;

  function toggleGift() {
    setOpened(wasOpen => !wasOpen);
  }

  return <main className="anniversary-app">
    <div className="anniversary-wrap">
      <nav className="anniversary-nav" aria-label="小空间导航">
        <a href="/zz/"><ArrowLeft size={15}/> 回到小空间</a>
        <Heart size={15} aria-hidden="true"/>
      </nav>

      <section className={`anniversary-layout ${opened ? 'is-open' : ''}`} aria-labelledby="anniversary-title">
        <div className="anniversary-copy">
          <p className="anniversary-address">给 ZZ · 我们的第一百天</p>
          <h1 id="anniversary-title">百日快乐，<br/>这是给你的。</h1>
          <p className="anniversary-intro">有件小礼物，想隔着屏幕先交到你手上。</p>
          <button type="button" className="anniversary-action" onClick={toggleGift}
            aria-controls="anniversary-note" aria-expanded={opened}>
            {opened ? <RotateCcw size={16} aria-hidden="true"/> : <Gift size={17} aria-hidden="true"/>}
            {opened ? '收好礼物' : '拆开礼物'}
          </button>
        </div>

        <button type="button" className="anniversary-stage" onClick={toggleGift} aria-controls="anniversary-note"
          aria-expanded={opened} aria-label={opened ? '收好星形礼盒' : '打开星形礼盒'}>
          <span className="anniversary-stage-frame" aria-hidden="true"/>
          <span className="anniversary-scene" aria-hidden="true">
            <span className="anniversary-pedestal"/>
            <span className="anniversary-box-inner"/>
            <span className="anniversary-bouquet">
              <img src="/zz/anniversary/gold-bouquet.webp" alt="" width="640" height="690" draggable={false}/>
            </span>
            <span className="anniversary-box-base"/>
            <span className="anniversary-box-lid">
              <span className="anniversary-lid-ribbon"/>
              <span className="anniversary-bow"><i/><i/><b/></span>
            </span>
            {opened ? <span className="anniversary-glints">
              {glints.map(([x, y, delay, symbol]) => <span key={x}
                style={{'--x': `${x}px`, '--y': `${y}px`, '--delay': `${delay}ms`} as CSSProperties}>{symbol}</span>)}
            </span> : <span className="anniversary-gift-tag">To ZZ <Heart size={9}/></span>}
          </span>
          <span className="anniversary-stage-caption" aria-hidden="true"><Sparkles size={13}/>{opened ? '把花收好，下次再拆' : '轻轻点一下礼盒'}</span>
        </button>

        <div id="anniversary-note" className="anniversary-note-slot" hidden={!opened}>
          {opened && <article className="anniversary-note" aria-labelledby="anniversary-note-title">
            <div className="anniversary-note-rule" aria-hidden="true"><Heart size={12}/></div>
            <h2 id="anniversary-note-title">一束不会凋谢的小花</h2>
            <p>百日快乐，宝宝。这束花很小，小到刚好能在你的桌上留一个位置。见不到你的时候，就让它替我陪着你。</p>
            <p>以后，想在我们的小家里给它留一个角落。也想在每个纪念日，站在你面前，亲手把花递给你。</p>
            <p className="anniversary-signoff">爱你的师言 <Heart size={12} aria-hidden="true"/></p>
          </article>}
        </div>
      </section>
    </div>
  </main>;
}
