-- Shared cupboard for the two authenticated space members. Only the Edge API can read/write.
create table if not exists public.snack_inventory (
 id text primary key,
 finished boolean not null default false,
 updated_at timestamptz not null default now()
);
alter table public.snack_inventory enable row level security;
revoke all on public.snack_inventory from anon, authenticated;
insert into public.snack_inventory(id) values
 ('100088472687'),
 ('10163336151885'),
 ('10023678233568'),
 ('10024905493905'),
 ('10180309637164'),
 ('10092492882993'),
 ('10153938998112'),
 ('65791770474'),
 ('10145236930157'),
 ('10192696970059'),
 ('10102049763826'),
 ('10035608528614'),
 ('10127303209425'),
 ('10158581366012'),
 ('10228955199393'),
 ('10195523034831'),
 ('10108939910311'),
 ('10076588888210'),
 ('10101897475631'),
 ('10091922001315'),
 ('10207424937271'),
 ('10211599295792'),
 ('10224324318015'),
 ('10114466730921')
on conflict (id) do nothing;
