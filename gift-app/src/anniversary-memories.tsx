import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, CalendarDays, Gift, X, ZoomIn} from 'lucide-react';
import type {AnniversaryAlbum, AnniversaryPhoto} from './anniversary-photos';
import './anniversary-memories.css';

type Frame = {index: number; urls: string[]};
type Projection = {current: Frame; previous?: Frame; direction: 'forward' | 'back'};

function formatDay(date: string) {
  const [year, month, day] = date.slice(0, 10).split('-');
  return `${year} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

export function AnniversaryMemories({album, onFinish}: {album: AnniversaryAlbum; onFinish: () => void}) {
  const {scenes} = album;
  const [target, setTarget] = useState(0);
  const [projection, setProjection] = useState<Projection>();
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [enlarged, setEnlarged] = useState<{photo: AnniversaryPhoto; url: string}>();
  const panel = useRef<HTMLElement>(null);
  const dates = useRef<HTMLDialogElement>(null);
  const detail = useRef<HTMLDialogElement>(null);
  const gesture = useRef<{x: number; y: number}>(undefined);
  const frame = projection?.current;
  const index = frame?.index ?? 0;
  const scene = scenes[index];
  const loading = !failed && frame?.index !== target;
  const last = index === scenes.length - 1;
  const chapterNumber = [...new Set(scenes.map(item => item.chapter))].indexOf(scene.chapter) + 1;
  const day = scene.photos[0].takenAt.slice(0, 10);

  useEffect(() => {
    panel.current?.focus({preventScroll: true});
  }, []);

  useEffect(() => {
    let active = true;
    void album.images(target).then(urls => {
      if (!active) return;
      setProjection(previous => previous?.current.index === target ? previous : {
        current: {index: target, urls},
        previous: previous?.current,
        direction: previous && target < previous.current.index ? 'back' : 'forward',
      });
      for (const next of [target + 1, target - 1]) {
        if (scenes[next]) void album.images(next).catch(() => {});
      }
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [album, scenes, target, retry]);

  useEffect(() => {
    if (enlarged && !detail.current?.open) detail.current?.showModal();
  }, [enlarged]);

  function finish() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) onFinish();
    else setFinishing(true);
  }

  function goTo(next: number) {
    if (!scenes[next] || next === target) return;
    setFailed(false);
    setTarget(next);
  }

  function framePhotos(item: Frame, fading: boolean) {
    return <div key={item.index} inert={fading}
      className={`anniversary-film-frames count-${item.urls.length}${fading ? ' is-leaving' : ' is-current'}`}>
      {scenes[item.index].photos.map((photo, i) => <figure key={photo.number} className="anniversary-film-print">
        <button type="button" className="anniversary-film-image" aria-label={`放大照片：${photo.caption}`}
          onClick={() => setEnlarged({photo, url: item.urls[i]})}>
          <img src={item.urls[i]} alt={photo.alt} draggable={false}/>
          <ZoomIn size={15} aria-hidden="true"/>
        </button>
        <figcaption>{photo.caption}</figcaption>
      </figure>)}
    </div>;
  }

  return <section className={`anniversary-memories${finishing ? ' is-finishing' : ''}`} id="anniversary-memories" ref={panel}
    aria-labelledby="anniversary-memories-title" tabIndex={-1}
    inert={finishing}
    onAnimationEnd={event => {
      if (event.target === event.currentTarget && event.animationName === 'anniversary-film-finish') onFinish();
    }}
    onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey || dates.current?.open || detail.current?.open || loading) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(index + (event.key === 'ArrowRight' ? 1 : -1));
      }
    }}>
    <header className="anniversary-memory-heading">
      <h2 id="anniversary-memories-title">沿着日子去见你</h2>
      <button type="button" className="anniversary-film-dates" onClick={() => dates.current?.showModal()}>
        <CalendarDays size={16} aria-hidden="true"/> 按日期回看
      </button>
    </header>

    <div className="anniversary-film-board">
      <div className="anniversary-film-label">
        <span><i>{String(chapterNumber).padStart(2, '0')}</i> {scene.chapter}</span>
        <time dateTime={day}>{formatDay(day)}</time>
      </div>
      <div className="anniversary-film-story" aria-live="polite" aria-atomic="true">
        <h3>{scene.title}</h3>
        <p>{scene.bridge}</p>
      </div>
      <div className={`anniversary-film-window ${projection?.direction ?? 'forward'}`} aria-busy={loading}
        onTouchStart={event => {
          const first = event.touches[0];
          gesture.current = event.touches.length === 1 ? {x: first.clientX, y: first.clientY} : undefined;
        }}
        onTouchCancel={() => { gesture.current = undefined; }}
        onTouchEnd={event => {
          const start = gesture.current;
          gesture.current = undefined;
          const end = event.changedTouches[0];
          if (!start || !end || loading) return;
          const dx = end.clientX - start.x;
          if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(end.clientY - start.y) * 1.4) goTo(index + (dx < 0 ? 1 : -1));
        }}>
        {projection?.previous && framePhotos(projection.previous, true)}
        {frame && framePhotos(frame, false)}
        {!frame && loading && <p className="anniversary-film-message" role="status">正在把第一张照片夹进来…</p>}
      </div>
    </div>

    <div className="anniversary-film-footer">
      <button type="button" className="anniversary-film-prev" aria-disabled={!index || loading}
        onClick={() => { if (!loading) goTo(index - 1); }}>
        <ArrowLeft size={17} aria-hidden="true"/> <span>上一幕</span>
      </button>
      <div className="anniversary-film-progress">
        <span>{index + 1} / {scenes.length} 幕</span>
        <progress value={frame ? index + 1 : 0} max={scenes.length} aria-label="看过的时光机进度"/>
      </div>
      {failed ? <button type="button" className="anniversary-film-next" onClick={() => { setFailed(false); setRetry(value => value + 1); }}>
        重新取照片 <ArrowRight size={16} aria-hidden="true"/>
      </button> : <button type="button" className="anniversary-film-next" aria-disabled={loading}
        onClick={() => { if (!loading) last ? finish() : goTo(index + 1); }}>
        {last ? '去打开礼盒' : '下一幕'} {last ? <Gift size={16} aria-hidden="true"/> : <ArrowRight size={16} aria-hidden="true"/>}
      </button>}
    </div>

    <dialog className="anniversary-film-dialog" aria-labelledby="anniversary-date-title" ref={dates}>
      <header><h3 id="anniversary-date-title">回到那一天</h3><button type="button" aria-label="关闭日期目录" onClick={() => dates.current?.close()}><X size={20}/></button></header>
      <ol className="anniversary-film-index">
        {scenes.map((item, i) => {
          const date = item.photos[0].takenAt.slice(0, 10);
          return <li key={item.photos[0].number}>
            <button type="button" aria-current={i === index ? 'step' : undefined} onClick={() => { dates.current?.close(); goTo(i); }}>
              <time dateTime={date}>{formatDay(date)}</time><span>{item.title}</span><ArrowRight size={14} aria-hidden="true"/>
            </button>
          </li>;
        })}
      </ol>
    </dialog>

    <dialog className="anniversary-film-dialog anniversary-film-fullscreen" ref={detail} aria-label="照片特写" onClose={() => setEnlarged(undefined)}>
      {enlarged && <figure>
        <button type="button" aria-label="关闭照片特写" onClick={() => detail.current?.close()}><X size={20}/></button>
        <img src={enlarged.url} alt={enlarged.photo.alt}/>
        <figcaption>{enlarged.photo.caption}</figcaption>
      </figure>}
    </dialog>
  </section>;
}
