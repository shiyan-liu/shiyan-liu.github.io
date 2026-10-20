alter table public.snack_inventory
 add column if not exists rating numeric(2,1)
 check (rating between 0.5 and 5 and rating * 2 = trunc(rating * 2));
