import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {ArrowLeft, Gift, Heart, RotateCcw, Sparkles, X, ZoomIn} from 'lucide-react';
import {supabase} from './space-session';
import './anniversary.css';

const boxArt = '/zz/anniversary/star-box-cartoon.webp';

const glints = [
  [-114, -102, 15, '✦'], [-78, -149, 90, '✧'], [33, -163, 120, '✦'],
  [108, -111, 210, '✧'], [133, -48, 90, '♡'], [112, 26, 180, '✦'],
  [-135, -18, 160, '♡'], [-50, -95, 100, '✧'], [67, -97, 250, '✦'],
] as const;

export function AnniversaryApp() {
  const [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(false);
  const flowerDetail = useRef<HTMLDialogElement>(null);

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
            <span className="anniversary-case">
              <img className="anniversary-case-base" src={boxArt} alt="" draggable={false}/>
              <img className="anniversary-case-tray" src={boxArt} alt="" draggable={false}/>
              <span className="anniversary-case-hinge">
                <img className="anniversary-case-lining" src={boxArt} alt="" draggable={false}/>
                <span className="anniversary-case-shell" style={{maskImage: `url(${boxArt})`}}/>
              </span>
            </span>
            {opened && <span className="anniversary-glints">
              {glints.map(([x, y, delay, symbol]) => <span key={x}
                style={{'--x': `${x}px`, '--y': `${y}px`, '--delay': `${delay}ms`} as CSSProperties}>{symbol}</span>)}
            </span>}
          </span>
          <span className="anniversary-stage-caption" aria-hidden="true"><Sparkles size={13}/>{opened ? '把花收好，下次再拆' : '轻轻点一下礼盒'}</span>
        </button>

        <div id="anniversary-note" className="anniversary-note-slot" hidden={!opened}>
          {opened && <article className="anniversary-note" aria-labelledby="anniversary-note-title">
            <div className="anniversary-note-rule" aria-hidden="true"><Heart size={12}/></div>
            <h2 id="anniversary-note-title">一束不会凋谢的小花</h2>
            <p>百日快乐，宝宝。这束花很小，小到刚好能在你的桌上留一个位置。见不到你的时候，就让它替我陪着你。</p>
            <p>以后，想在我们的小家里给它留一个角落。也想在每个纪念日，站在你面前，亲手把花递给你。</p>
            <footer className="anniversary-note-foot">
              <button type="button" className="anniversary-detail-link" onClick={() => flowerDetail.current?.showModal()}>
                <ZoomIn size={15} aria-hidden="true"/> 看看小花
              </button>
              <p className="anniversary-signoff">爱你的师言 <Heart size={12} aria-hidden="true"/></p>
            </footer>
          </article>}
        </div>
      </section>
      <dialog ref={flowerDetail} className="anniversary-detail" aria-labelledby="anniversary-detail-title">
        <button type="button" className="anniversary-detail-close" aria-label="关闭小花特写"
          onClick={() => flowerDetail.current?.close()}><X size={19} aria-hidden="true"/></button>
        <div className="anniversary-detail-image">
          <img src={boxArt} alt="九朵金色玫瑰，系着粉色绶带"/>
        </div>
        <h2 id="anniversary-detail-title">九朵小玫瑰</h2>
      </dialog>
    </div>
  </main>;
}
