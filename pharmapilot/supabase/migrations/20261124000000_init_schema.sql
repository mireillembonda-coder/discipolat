-- PharmaPilot AI — schéma initial (fondations).
-- Multi-officines : un utilisateur peut appartenir à plusieurs pharmacies avec un rôle par pharmacie.
-- Toutes les tables métier sont protégées par RLS et cloisonnées par pharmacy_id.
-- Aucune donnée de démonstration n'est stockée ici : la démo vit uniquement côté client.

create extension if not exists "pgcrypto";

-- Profils ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  locale text not null default 'fr',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pharmacies et membres -------------------------------------------------------
create table public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  country text not null default 'CM',
  currency text not null default 'XAF',
  timezone text not null default 'Africa/Douala',
  created_at timestamptz not null default now()
);

create type public.member_role as enum ('owner', 'pharmacist', 'technician', 'viewer');

create table public.pharmacy_members (
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (pharmacy_id, user_id)
);

-- Fonctions d'autorisation (security definer pour éviter la récursion RLS)
create or replace function public.is_pharmacy_member(p uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pharmacy_members where pharmacy_id = p and user_id = auth.uid());
$$;

create or replace function public.has_pharmacy_role(p uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from pharmacy_members where pharmacy_id = p and user_id = auth.uid() and role = any (roles));
$$;

-- Données métier (alimentées par l'importation) ------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  code text not null,              -- CIP / EAN / code interne du LGO
  name text not null,
  category text,
  purchase_price numeric(14, 2),
  sale_price numeric(14, 2),
  pack_size integer,
  supplier text,
  unique (pharmacy_id, code)
);

create table public.sales_lines (
  id bigint generated always as identity primary key,
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  sold_at timestamptz not null,
  product_id uuid references public.products (id) on delete set null,
  ticket_ref text,
  quantity numeric(12, 2) not null,
  unit_price numeric(14, 2) not null,
  unit_cost numeric(14, 2),
  import_id uuid
);
create index sales_lines_pharmacy_date on public.sales_lines (pharmacy_id, sold_at);

create table public.stock_levels (
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  snapshot_date date not null,
  quantity numeric(12, 2) not null,
  nearest_expiry date,
  import_id uuid,
  primary key (pharmacy_id, product_id, snapshot_date)
);

create type public.import_status as enum ('pending', 'processing', 'done', 'failed');

create table public.imports (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  dataset text not null check (dataset in ('sales', 'products', 'stock', 'purchases')),
  file_name text,
  status public.import_status not null default 'pending',
  row_count integer,
  error text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- RLS -------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.pharmacies enable row level security;
alter table public.pharmacy_members enable row level security;
alter table public.products enable row level security;
alter table public.sales_lines enable row level security;
alter table public.stock_levels enable row level security;
alter table public.imports enable row level security;

create policy "profil personnel" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "lecture pharmacies membres" on public.pharmacies
  for select using (public.is_pharmacy_member(id));
create policy "modification par titulaire" on public.pharmacies
  for update using (public.has_pharmacy_role(id, array['owner']::public.member_role[]));

create policy "lecture membres" on public.pharmacy_members
  for select using (public.is_pharmacy_member(pharmacy_id));
create policy "gestion membres par titulaire" on public.pharmacy_members
  for all using (public.has_pharmacy_role(pharmacy_id, array['owner']::public.member_role[]))
  with check (public.has_pharmacy_role(pharmacy_id, array['owner']::public.member_role[]));

create policy "lecture produits" on public.products for select using (public.is_pharmacy_member(pharmacy_id));
create policy "lecture ventes" on public.sales_lines for select using (public.is_pharmacy_member(pharmacy_id));
create policy "lecture stock" on public.stock_levels for select using (public.is_pharmacy_member(pharmacy_id));
create policy "lecture imports" on public.imports for select using (public.is_pharmacy_member(pharmacy_id));
create policy "création imports" on public.imports for insert
  with check (public.has_pharmacy_role(pharmacy_id, array['owner', 'pharmacist']::public.member_role[]) and created_by = auth.uid());

-- Les écritures massives (produits, ventes, stock) passeront par une Edge Function
-- utilisant la clé service, après validation du fichier importé (à connecter).
-- La création d'une pharmacie et du membre « owner » passera par une fonction RPC d'onboarding (à connecter).
