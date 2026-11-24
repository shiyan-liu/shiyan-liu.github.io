import {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight} from 'lucide-react';
import {anniversaryPhotos} from './anniversary-photos';
import './anniversary-memories.css';

const photos = [...anniversaryPhotos].sort((a, b) => a.takenAt.localeCompare(b.takenAt));

export function AnniversaryMemories({active}: {active: boolean}) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState<{index: number; missing: boolean} | null>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (active) panel.current?.focus({preventScroll: true});
  }, [active]);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      const clear = window.setTimeout(() => setShown(null), 320);
      return () => window.clearTimeout(clear);
    }
    let current = true;
    const image = new Image();
    image.src = photos[index].src;
    void image.decode().then(
      () => { if (current) setShown({index, missing: false}); },
      () => { if (current) setShown({index, missing: true}); },
    );
    return () => { current = false; };
  }, [active, index]);

  if (!photos.length) return null;
  const photo = photos[shown?.index ?? index];
  const [year, month, day] = photo.takenAt.slice(0, 10).split('-');
  const time = photo.takenAt.slice(11, 16);

  return <section ref={panel} className="anniversary-memories" id="anniversary-memories" tabIndex={-1} inert={!active} aria-labelledby="anniversary-memories-title">
    <header className="anniversary-memory-heading">
      <h2 id="anniversary-memories-title">我们的时光机</h2>
      <span>{index + 1} / {photos.length}</span>
    </header>
    <figure className="anniversary-memory-frame">
      <div className="anniversary-memory-photo" aria-busy={active && shown?.index !== index}>
        {shown && (shown.missing ? <p role="status">这张照片暂时打不开</p> : <img src={photo.src} alt={photo.alt}/>)}
      </div>
      <figcaption aria-live="polite">
        <time dateTime={photo.takenAt}>{year} 年 {Number(month)} 月 {Number(day)} 日{time && ` · ${time}`}</time>
        {photo.caption && <span>{photo.caption}</span>}
      </figcaption>
    </figure>
    {photos.length > 1 && <div className="anniversary-memory-controls">
      <button type="button" aria-label="上一张照片" onClick={() => setIndex(index - 1)} disabled={index === 0}><ArrowLeft size={16} aria-hidden="true"/></button>
      <input type="range" aria-label="翻到某张照片" aria-valuetext={`第 ${index + 1} 张，共 ${photos.length} 张`}
        min={0} max={photos.length - 1} value={index} onChange={event => setIndex(event.currentTarget.valueAsNumber)}/>
      <button type="button" aria-label="下一张照片" onClick={() => setIndex(index + 1)} disabled={index === photos.length - 1}><ArrowRight size={16} aria-hidden="true"/></button>
    </div>}
  </section>;
}
