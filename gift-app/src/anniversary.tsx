import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties} from 'react';
import {preload} from 'react-dom';
import {ArrowDown, ArrowLeft, ArrowRight, BookOpen, Heart, RotateCcw, X, ZoomIn} from 'lucide-react';
import {AnniversaryMemories} from './anniversary-memories';
import {loadAnniversaryAlbum, type AnniversaryAlbum} from './anniversary-photos';
import {supabase} from './space-session';
import './anniversary.css';

const boxArt = '/zz/anniversary/vr1700-star-box.webp?v=2';
const closedLidArt = '/zz/anniversary/vr1700-lid.webp';
const bouquetTitle = '给你的金色玫瑰';
const stageDetails = {
  seal: {label: '封签', action: '揭开封签', status: '礼物已封好', duration: 920},
  memories: {label: '时光机', action: '去打开礼盒', status: '时光机已打开', duration: 1320},
  box: {label: '礼盒', action: '打开星形礼盒', status: '礼盒在等你打开', duration: 980},
  flowers: {label: '捧花', action: '翻开手写卡', status: '礼盒已打开', duration: 1120},
  letter: {label: '手写卡', action: '把礼物封好', status: '手写卡已展开', duration: 720},
} as const;
type Stage = keyof typeof stageDetails;
const stages: readonly Stage[] = ['seal', 'memories', 'box', 'flowers', 'letter'];
const glints = [
  [-104, -55, 0], [-80, -108, 90], [-39, -134, 100], [0, -157, 170],
  [43, -130, 135], [86, -98, 95], [110, -49, 180], [94, -6, 225], [-91, 1, 205],
] as const;

export function AnniversaryApp() {
  preload(boxArt, {as: 'image'});
  preload(closedLidArt, {as: 'image'});
  preload('/zz/anniversary/letter-script.woff', {as: 'font', type: 'font/woff', crossOrigin: 'anonymous'});
  const [ready, setReady] = useState(false);
  const [stage, setStage] = useState<Stage>('seal');
  const [album, setAlbum] = useState<AnniversaryAlbum>();
  const [albumFailed, setAlbumFailed] = useState(false);
  const [albumRetry, setAlbumRetry] = useState(0);
  const [inMotion, setInMotion] = useState(false);
  const [filmVisible, setFilmVisible] = useState(false);
  const motionTimer = useRef<number>(undefined);
  const flowerDetail = useRef<HTMLDialogElement>(null);
  const mainAction = useRef<HTMLButtonElement>(null);
  const presentation = useRef<HTMLElement>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const filmSlot = useRef<HTMLDivElement>(null);
  const note = useRef<HTMLElement>(null);
  const opened = stage === 'flowers' || stage === 'letter';
  const unfolded = stage === 'letter';
  const rewinding = stage === 'memories';
  const step = stages.indexOf(stage);
  const {action, status} = stageDetails[stage];

  useEffect(() => {
    if (location.hash.startsWith('#album=')) {
      history.replaceState(history.state, '', location.pathname + location.search);
    }
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
    if (!ready) return;
    let active = true;
    let current: AnniversaryAlbum | undefined;
    void loadAnniversaryAlbum().then(value => {
      if (!active) { value.dispose(); return; }
      current = value;
      setAlbum(value);
      void value.images(0).catch(() => {});
    }).catch(() => { if (active) setAlbumFailed(true); });
    return () => { active = false; current?.dispose(); };
  }, [ready, albumRetry]);

  useEffect(() => {
    if (unfolded && matchMedia('(max-width: 760px) and (prefers-reduced-motion: reduce)').matches) {
      note.current?.scrollIntoView({block: 'nearest'});
    }
  }, [unfolded]);

  useEffect(() => () => window.clearTimeout(motionTimer.current), []);

  useLayoutEffect(() => {
    const frame = gallery.current;
    const film = filmSlot.current;
    if (!frame || !film) return;

    const fitFilm = () => frame.style.setProperty('--film-height', `${film.offsetHeight}px`);
    fitFilm();
    const observer = new ResizeObserver(fitFilm);
    observer.observe(film);
    return () => {
      observer.disconnect();
      frame.style.removeProperty('--film-height');
    };
  }, [filmVisible]);

  useEffect(() => {
    if (stage === 'box') mainAction.current?.focus({preventScroll: true});
  }, [stage]);

  if (!ready) return <main className="anniversary-app anniversary-loading" role="status">正在取出你的小礼物…</main>;

  function moveTo(nextStage: Stage) {
    window.clearTimeout(motionTimer.current);
    setStage(nextStage);
    const animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    setFilmVisible(nextStage === 'memories' && !animate);
    setInMotion(animate);
    if (animate) motionTimer.current = window.setTimeout(() => {
      if (nextStage === 'memories') setFilmVisible(true);
      setInMotion(false);
    }, stageDetails[nextStage].duration);
  }

  function advance() {
    if (!inMotion) moveTo(stages[step + 1] ?? 'seal');
  }

  function handleStageClick() {
    if (inMotion) return;
    if (opened) flowerDetail.current?.showModal();
    else advance();
  }

  return <main className="anniversary-app">
    <div className="anniversary-wrap">
      <nav className="anniversary-nav" aria-label="小空间导航">
        <a href="/zz/"><ArrowLeft size={16} aria-hidden="true"/> 回到小空间</a>
        <span>男朋友 <Heart size={11} aria-hidden="true"/> ZZ</span>
      </nav>

      <header className="anniversary-header">
        <p className="anniversary-address">给 ZZ · 我们的第一百天</p>
        <h1 id="anniversary-title">把第一百天，留在这里</h1>
      </header>

      <section ref={presentation} className={`anniversary-folio step-${stage}${opened ? ' is-open' : ''}${unfolded ? ' is-unfolded' : ''}`}
        aria-labelledby="anniversary-title">
        <div ref={gallery} className="anniversary-gallery">
          <div className="anniversary-inlay" aria-hidden="true"/>
          <button type="button" className="anniversary-stage" onClick={handleStageClick} inert={rewinding} aria-disabled={inMotion || undefined}
            aria-label={opened ? '放大看看这束花' : action}
            aria-controls={opened ? 'anniversary-detail' : 'anniversary-gift-scene'} aria-haspopup={opened ? 'dialog' : undefined}>
            <span id="anniversary-gift-scene" className="anniversary-scene" aria-hidden="true">
              <span className="anniversary-pedestal"/>
              <span className="anniversary-bloom-light"/>
              <span className="anniversary-case">
                <img className="anniversary-case-base" src={boxArt} alt="" draggable={false}/>
                <img className="anniversary-case-tray" src={boxArt} alt="" draggable={false}/>
                <span className="anniversary-case-hinge">
                  <img className="anniversary-case-lining" src={boxArt} alt="" draggable={false}/>
                  <img className="anniversary-case-shell" src={closedLidArt} alt="" draggable={false}/>
                </span>
              </span>
              {opened && <span className="anniversary-glints">
                {glints.map(([x, y, delay]) => <i key={x}
                  style={{'--x': `${x}px`, '--y': `${y}px`, '--delay': `${delay}ms`} as CSSProperties}/>)}
              </span>}
              <span className="anniversary-envelope" onTransitionEnd={event => {
                if (rewinding && event.target === event.currentTarget && event.propertyName === 'opacity') setFilmVisible(true);
              }}>
                <span className="anniversary-envelope-pocket"/>
                <span className="anniversary-envelope-flap"/>
                <span className="anniversary-envelope-to">写给 <i>ZZ</i></span>
                <span className="anniversary-wax"><span className="anniversary-wax-mark"><Heart size={10}/><i>100</i></span></span>
              </span>
            </span>
            <span className="anniversary-zoom" aria-hidden="true"><ZoomIn size={15}/> 看看这束花</span>
          </button>
          {filmVisible && <div ref={filmSlot} className="anniversary-film-slot">
            {album ? <AnniversaryMemories album={album} onFinish={() => moveTo('box')}/> :
              <div className="anniversary-film-wait">
                <p role="status">{albumFailed ? '这卷胶片暂时没有取出来。' : '时光机正在把胶片卷好…'}</p>
                {albumFailed && <div>
                  <button type="button" className="anniversary-film-next" onClick={() => {setAlbumFailed(false); setAlbumRetry(value => value + 1);}}>再试一次</button>
                  <button type="button" className="anniversary-film-dates" onClick={() => moveTo('box')}>先去开礼盒</button>
                </div>}
              </div>}
          </div>}

          <div className="anniversary-note-slot" inert={!unfolded} onTransitionEnd={event => {
            if (event.target === event.currentTarget && event.propertyName === 'grid-template-rows') {
              (unfolded ? note.current : presentation.current)?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
            }
          }}>
            <div className="anniversary-note-paper">
              <article ref={note} className="anniversary-note" aria-labelledby="anniversary-note-title">
                <div className="anniversary-note-heading">
                  <span>给 ZZ</span>
                  <span className="anniversary-note-heart" aria-hidden="true"><Heart size={19}/></span>
                </div>
                <h2 id="anniversary-note-title">一束不会凋谢的小花</h2>
                <div className="anniversary-note-lines">
                  <p>宝宝，<em>百日快乐。</em>这束花很小，小到刚好能在你的桌上留一个位置。见不到你的时候，就让它<em>替我陪着你</em>。</p>
                  <p>以后，想在我们的小家里给它留一个角落。也想在每个纪念日，站在你面前，<em>亲手把花递给你</em>。</p>
                </div>
                <p className="anniversary-signoff">爱你的男朋友 <Heart size={12} aria-hidden="true"/></p>
              </article>
            </div>
          </div>
        </div>

        <div className="anniversary-controls">
          <ol className="anniversary-progress" aria-label="拆礼物进度">
            {stages.map((item, index) => <li key={item} aria-current={stage === item ? 'step' : undefined}
              className={index < step ? 'is-past' : ''}>{stageDetails[item].label}</li>)}
          </ol>
          {rewinding ? <span className="anniversary-action-space" aria-hidden="true"/> : <button ref={mainAction} type="button" className="anniversary-action" onClick={advance} aria-disabled={inMotion || undefined}>
            {unfolded ? <RotateCcw size={16} aria-hidden="true"/> : opened ? <BookOpen size={16} aria-hidden="true"/> : null}
            {action}
            {!unfolded && (stage === 'seal' ? <ArrowDown size={16} aria-hidden="true"/> : <ArrowRight size={16} aria-hidden="true"/>)}
          </button>}
          {stage !== 'seal' && !unfolded ? <button type="button" className="anniversary-reset" onClick={() => moveTo('seal')} aria-label="从头再拆" title="从头再拆"><RotateCcw size={16} aria-hidden="true"/></button> : <span/>}
        </div>
        <span className="anniversary-sr" role="status">{rewinding && !filmVisible ? '正在揭开封签' : status}</span>
      </section>

      <dialog ref={flowerDetail} id="anniversary-detail" className="anniversary-detail" aria-labelledby="anniversary-detail-title">
        <button type="button" className="anniversary-detail-close" aria-label="关闭手捧花特写"
          onClick={() => flowerDetail.current?.close()}><X size={19} aria-hidden="true"/></button>
        <div className="anniversary-detail-image">
          <img src={boxArt} alt="九朵金色玫瑰，花头外沿有粉色绶带"/>
        </div>
        <h2 id="anniversary-detail-title">{bouquetTitle}</h2>
      </dialog>
    </div>
  </main>;
}
