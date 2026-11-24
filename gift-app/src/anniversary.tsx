import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {ArrowDown, ArrowLeft, ArrowRight, BookOpen, Heart, RotateCcw, X, ZoomIn} from 'lucide-react';
import {supabase} from './space-session';
import './anniversary.css';

const boxArt = '/zz/anniversary/vr1700-star-box.webp';
const steps = ['封签', '礼盒', '捧花', '手写卡'] as const;
const actionLabels = ['揭开封签', '打开星形礼盒', '翻开手写卡', '把礼物封好'] as const;
const glints = [
  [-104, -55, 0], [-80, -108, 90], [-39, -134, 100], [0, -157, 170],
  [43, -130, 135], [86, -98, 95], [110, -49, 180], [94, -6, 225], [-91, 1, 205],
] as const;

export function AnniversaryApp() {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const flowerDetail = useRef<HTMLDialogElement>(null);
  const presentation = useRef<HTMLElement>(null);
  const note = useRef<HTMLElement>(null);
  const opened = step >= 2;
  const unfolded = step === 3;

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

  useEffect(() => {
    if (unfolded && matchMedia('(max-width: 670px)').matches) {
      note.current?.scrollIntoView({block: 'nearest'});
    }
  }, [unfolded]);

  if (!ready) return <main className="anniversary-app anniversary-loading" role="status">正在取出你的小礼物…</main>;

  function advance() {
    if (unfolded) {
      setStep(0);
      return;
    }
    setStep(current => Math.min(current + 1, 3));
  }

  function reset() {
    setStep(0);
    presentation.current?.scrollIntoView({block: 'nearest'});
  }

  return <main className="anniversary-app">
    <div className="anniversary-wrap">
      <nav className="anniversary-nav" aria-label="小空间导航">
        <a href="/zz/"><ArrowLeft size={16} aria-hidden="true"/> 回到小空间</a>
        <span>师言 <Heart size={11} aria-hidden="true"/> ZZ</span>
      </nav>

      <header className="anniversary-header">
        <p className="anniversary-address">给 ZZ · 我们的第一百天</p>
        <h1 id="anniversary-title">把第一百天，留在这里</h1>
      </header>

      <section ref={presentation} className={`anniversary-folio step-${step}${opened ? ' is-open' : ''}${unfolded ? ' is-unfolded' : ''}`}
        aria-labelledby="anniversary-title">
        <div className="anniversary-gallery">
          <div className="anniversary-inlay" aria-hidden="true"/>
          <button type="button" className="anniversary-stage" onClick={opened ? () => flowerDetail.current?.showModal() : advance}
            aria-label={opened ? '放大看九朵玫瑰' : actionLabels[step]}
            aria-controls={opened ? 'anniversary-detail' : 'anniversary-gift-scene'} aria-haspopup={opened ? 'dialog' : undefined}>
            <span id="anniversary-gift-scene" className="anniversary-scene" aria-hidden="true">
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
                {glints.map(([x, y, delay]) => <i key={x}
                  style={{'--x': `${x}px`, '--y': `${y}px`, '--delay': `${delay}ms`} as CSSProperties}/>)}
              </span>}
              <span className="anniversary-envelope">
                <span className="anniversary-envelope-flap"/>
                <span className="anniversary-envelope-to">给 <i>ZZ</i></span>
                <span className="anniversary-wax"><span>100</span><Heart size={11}/></span>
              </span>
            </span>
            {opened && <span className="anniversary-zoom"><ZoomIn size={15} aria-hidden="true"/> 看看小花</span>}
          </button>

          {unfolded && <article ref={note} className="anniversary-note" aria-labelledby="anniversary-note-title">
            <span className="anniversary-note-rule" aria-hidden="true"><Heart size={12}/></span>
            <h2 id="anniversary-note-title">一束不会凋谢的小花</h2>
            <p>百日快乐，宝宝。这束花很小，小到刚好能在你的桌上留一个位置。见不到你的时候，就让它替我陪着你。</p>
            <p>以后，想在我们的小家里给它留一个角落。也想在每个纪念日，站在你面前，亲手把花递给你。</p>
            <p className="anniversary-signoff">爱你的师言 <Heart size={12} aria-hidden="true"/></p>
          </article>}
        </div>

        <div className="anniversary-controls">
          <ol className="anniversary-progress" aria-label="拆礼物进度">
            {steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined}
              className={index < step ? 'is-past' : ''}>{label}</li>)}
          </ol>
          <button type="button" className="anniversary-action" onClick={advance}>
            {unfolded ? <RotateCcw size={16} aria-hidden="true"/> : step === 2 ? <BookOpen size={16} aria-hidden="true"/> : null}
            {actionLabels[step]}
            {!unfolded && (step === 0 ? <ArrowDown size={16} aria-hidden="true"/> : <ArrowRight size={16} aria-hidden="true"/>)}
          </button>
          {step > 0 && step < 3 ? <button type="button" className="anniversary-reset" onClick={reset} aria-label="从头再拆" title="从头再拆"><RotateCcw size={16} aria-hidden="true"/></button> : <span/>}
        </div>
        <span className="anniversary-sr" role="status">{step === 1 ? '封签已拆开' : step === 2 ? '礼盒已打开' : step === 3 ? '手写卡已展开' : '礼物已封好'}</span>
      </section>

      <dialog ref={flowerDetail} id="anniversary-detail" className="anniversary-detail" aria-labelledby="anniversary-detail-title">
        <button type="button" className="anniversary-detail-close" aria-label="关闭小花特写"
          onClick={() => flowerDetail.current?.close()}><X size={19} aria-hidden="true"/></button>
        <div className="anniversary-detail-image">
          <img src={boxArt} alt="九朵金色玫瑰，花头外沿有粉色绶带"/>
        </div>
        <h2 id="anniversary-detail-title">九朵小玫瑰</h2>
      </dialog>
    </div>
  </main>;
}
