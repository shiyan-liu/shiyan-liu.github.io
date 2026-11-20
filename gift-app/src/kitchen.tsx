import React, {useEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowUpRight, BookOpen, Check, Coffee, CookingPot, Minus, Plus, Search, Send, ShoppingBasket, Sunrise, X} from 'lucide-react';
import {kitchenMeals, kitchenMenu} from '../../supabase/functions/_shared/kitchen-menu.ts';
import {cfg, supabase} from './space-session';
import photoData from './kitchen-photos.json';
import './kitchen.css';

type Dish = (typeof kitchenMenu)[number];
type Meal = keyof typeof kitchenMeals;
type Photo = {title: string; creator: string; foreign_landing_url: string; license: string; license_url: string};
const photos: Record<string, Photo> = photoData;
const categories = Array.from(new Set(kitchenMenu.map(dish => dish.category)));
const errorMessages: Record<string, string> = {
  RATE_LIMITED: '点单太频繁啦，稍后再试一次。',
  MAIL_UNAVAILABLE: '邮件暂时没发出去，已保留这份点单，可以再试一次。',
  UNAUTHORIZED: '请先回到小空间对一下暗号，再来点单。',
  FORBIDDEN: '这个账号暂时不能点单。',
  INVALID_INPUT: '请检查点单类型、菜品数量和备注。',
};

function DishPhoto({dish, eager = false}: {dish: Dish; eager?: boolean}) {
  return <img src={`/zz/kitchen/images/${dish.id}.webp`} alt={dish.name}
    width="480" height="320" loading={eager ? 'eager' : 'lazy'} decoding="async"/>;
}

export function KitchenApp() {
  const [ready, setReady] = useState(false);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [meal, setMeal] = useState<Meal | ''>('');
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{meal: Meal; orderId: string; count: number} | null>(null);
  const [recipe, setRecipe] = useState<Dish | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<{payload: string; id: string} | null>(null);
  const orderPanel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({data}) => {
      if (!active) return;
      if (data.session) setReady(true);
      else location.replace('/zz/?next=kitchen');
    });
    const {data} = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && !session) location.replace('/zz/?next=kitchen');
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const chosen = kitchenMenu.filter(dish => basket[dish.id]);
  const quantity = chosen.reduce((total, dish) => total + basket[dish.id], 0);
  const query = search.trim().toLowerCase();
  const shown = kitchenMenu.filter(dish =>
    (!category || dish.category === category) &&
    (!query || [dish.name, dish.recipe, dish.category, dish.id].some(value => value.toLowerCase().includes(query)))
  );

  function changeQuantity(id: string, delta: number) {
    setReceipt(null);
    setError('');
    setBasket(current => {
      const next = {...current};
      const count = (next[id] || 0) + delta;
      if (count <= 0) delete next[id];
      else if (count <= 12 && (next[id] || Object.keys(next).length < 30)) next[id] = count;
      return next;
    });
  }

  function openRecipe(dish: Dish) {
    setRecipe(dish);
    dialog.current?.showModal();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!meal || !chosen.length || sending || !cfg || !supabase) return;
    setSending(true);
    setError('');
    const items = chosen.map(dish => ({id: dish.id, count: basket[dish.id]}));
    const payload = {meal, items, note: note.trim()};
    const serialized = JSON.stringify(payload);
    if (pending.current?.payload !== serialized) {
      pending.current = {payload: serialized, id: crypto.randomUUID()};
    }
    const orderId = pending.current.id;

    try {
      const {data} = await supabase.auth.getSession();
      if (!data.session) throw new Error('UNAUTHORIZED');
      const response = await fetch(`${cfg.supabaseUrl}/functions/v1/gift-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: cfg.publishableKey,
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({action: 'kitchen-order', orderId, ...payload}),
      });
      const result = await response.json();
      if (!response.ok || result.orderId !== orderId) throw new Error(result.error);
      setReceipt({meal, orderId, count: quantity});
      setBasket({});
      setNote('');
      setMeal('');
      pending.current = null;
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : '';
      setError(errorMessages[code] || '点单暂时没有送达，已保留菜品，请再试一次。');
    } finally {
      setSending(false);
    }
  }

  if (!ready) return <main className="kitchen-app kitchen-loading" role="status">正在打开小厨房…</main>;

  return <main className="kitchen-app">
    <div className="kitchen-wrap">
      <nav className="kitchen-nav"><a href="/zz/"><ArrowLeft size={16}/> 回到小空间</a><CookingPot size={18} aria-label="小厨房"/></nav>
      <header className="kitchen-hero">
        <div>
          <h1>我们的小厨房</h1>
          <p>想吃点什么？先挑喜欢的，再告诉我这是早餐还是点心。</p>
          <a href="#kitchen-menu">看看菜单 <ArrowUpRight size={16}/></a>
        </div>
        <div className="kitchen-hero-photo"><DishPhoto dish={kitchenMenu.find(dish => dish.id === 'pancake')!} eager/></div>
      </header>

      <div className="kitchen-layout">
        <section id="kitchen-menu" aria-label="菜品菜单" className="kitchen-menu">
          <div className="kitchen-menu-top">
            <h2>菜单 <small>{kitchenMenu.length} 道</small></h2>
            <label className="kitchen-search"><Search size={16}/><input type="search" placeholder="搜菜名或食材" aria-label="搜菜名或食材" value={search} onChange={event => setSearch(event.target.value)}/></label>
          </div>
          <div className="kitchen-filters" aria-label="菜品分类">
            {['', ...categories].map(item => <button type="button" key={item} aria-pressed={item === category} onClick={() => setCategory(item)}>{item || '全部'}</button>)}
          </div>
          {shown.length === 0 && <p className="kitchen-empty">没找到这道菜，试试别的关键词或看看全部分类。</p>}
          {categories.map(group => {
            const dishes = shown.filter(dish => dish.category === group);
            return dishes.length > 0 && <section className="kitchen-category" key={group}>
              <h3>{group}</h3>
              <div className="kitchen-grid">{dishes.map(dish => <article className="kitchen-card" key={dish.id}>
                <button type="button" className="kitchen-photo-button" onClick={() => openRecipe(dish)} aria-label={`查看${dish.name}的做法`}>
                  <DishPhoto dish={dish}/>
                </button>
                <div className="kitchen-card-info">
                  <div><h4>{dish.name}</h4><button className="kitchen-recipe-link" type="button" onClick={() => openRecipe(dish)}><BookOpen size={13}/> 看做法</button></div>
                  <button type="button" className="kitchen-add" aria-label={`添加${dish.name}`} disabled={sending || basket[dish.id] >= 12 || (!basket[dish.id] && chosen.length >= 30)} onClick={() => changeQuantity(dish.id, 1)}><Plus size={18}/>{basket[dish.id] > 0 && <span>{basket[dish.id]}</span>}</button>
                </div>
              </article>)}</div>
            </section>;
          })}
        </section>

        <aside id="kitchen-order" className="kitchen-order" ref={orderPanel} tabIndex={-1}>
          <h2><ShoppingBasket size={21}/> 这次想吃</h2>
          {receipt && <div className="kitchen-receipt" role="status"><Check size={17}/><div><strong>{kitchenMeals[receipt.meal]}点单已发出</strong><p>{receipt.count} 份 · {receipt.orderId.slice(0, 8).toUpperCase()}</p></div></div>}
          <form onSubmit={submit}>
            <fieldset disabled={sending}>
              <legend>这是哪一餐？</legend>
              <div className="kitchen-meal-options">
                {(['breakfast', 'snack'] as const).map(type => <label key={type}>
                  <input type="radio" name="kitchen-meal" required checked={meal === type} onChange={() => {setMeal(type); setReceipt(null);}}/>
                  {type === 'breakfast' ? <Sunrise size={18}/> : <Coffee size={18}/>}
                  {kitchenMeals[type]}
                </label>)}
              </div>
            </fieldset>
            {chosen.length ? <ul className="kitchen-order-items">{chosen.map(dish => <li key={dish.id}>
              <span>{dish.name}</span><div className="kitchen-stepper">
                <button type="button" disabled={sending} aria-label={`减少${dish.name}`} onClick={() => changeQuantity(dish.id, -1)}><Minus size={15}/></button>
                <span>{basket[dish.id]}</span>
                <button type="button" disabled={sending || basket[dish.id] >= 12} aria-label={`增加${dish.name}`} onClick={() => changeQuantity(dish.id, 1)}><Plus size={15}/></button>
              </div>
            </li>)}</ul> : <p className="kitchen-empty">挑几样喜欢的，放进这份点单。</p>}
            <label className="kitchen-note">口味备注 <span>可选</span><textarea placeholder="比如少糖、去冰、不要葱" maxLength={500} rows={2} value={note} disabled={sending} onChange={event => setNote(event.target.value)}/></label>
            {error && <p className="kitchen-error" role="alert">{error}</p>}
            <button className="kitchen-submit" type="submit" disabled={!meal || !quantity || sending}><Send size={16}/>{sending ? '正在发送…' : '确认点单并发邮件'}</button>
          </form>
          <span className="kitchen-sr" role="status">{quantity ? `已选 ${quantity} 份` : ''}</span>
        </aside>
      </div>

      {quantity > 0 && <button className="kitchen-mobile-cart" type="button" onClick={() => {
        orderPanel.current?.scrollIntoView({block: 'start'});
        orderPanel.current?.focus({preventScroll: true});
      }}><ShoppingBasket size={18}/> 已选 {quantity} 份 <span>查看点单 →</span></button>}

      <dialog ref={dialog} className="kitchen-dialog" onClose={() => setRecipe(null)} aria-labelledby="kitchen-recipe-name">
        {recipe && <>
          <DishPhoto dish={recipe}/>
          <button className="kitchen-close" type="button" aria-label="关闭做法" onClick={() => dialog.current?.close()}><X size={20}/></button>
          <div className="kitchen-recipe">
            <h2 id="kitchen-recipe-name">{recipe.name}</h2><p>{recipe.recipe}</p>
            <button className="kitchen-submit" type="button" disabled={sending || basket[recipe.id] >= 12 || (!basket[recipe.id] && chosen.length >= 30)} onClick={() => {changeQuantity(recipe.id, 1); dialog.current?.close();}}><Plus size={17}/> 加入点单</button>
            {photos[recipe.id] && <p className="kitchen-credit">参考图：
              <a href={photos[recipe.id].foreign_landing_url} target="_blank" rel="noreferrer">{photos[recipe.id].creator || photos[recipe.id].title}</a>
              {' · '}<a href={photos[recipe.id].license_url} target="_blank" rel="noreferrer">{photos[recipe.id].license.toUpperCase()}</a>
            </p>}
          </div>
        </>}
      </dialog>
    </div>
  </main>;
}
