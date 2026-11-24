-- PharmaPilot AI — fondations du schéma (comptes, organisations, officines).
-- Les données métier (ventes, stock, achats) feront l'objet de migrations ultérieures.
-- Les données de démonstration ne sont JAMAIS stockées en base : elles vivent dans le code client (/demo).

create type public.member_role as enum ('owner', 'admin', 'pharmacist', 'staff', 'viewer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  locale text not null default 'fr',
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_currency char(3) not null default 'XAF',
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  city text,
  country_code char(2),
  currency char(3) not null default 'XAF',
  timezone text not null default 'Africa/Douala',
  created_at timestamptz not null default now()
);
create index pharmacies_org_idx on public.pharmacies (organization_id);

-- Journal des imports (le traitement reste à connecter).
create table public.data_imports (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  kind text not null check (kind in ('sales', 'stock', 'purchases', 'catalog')),
  file_name text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- Fonctions d'appartenance (security definer pour éviter la récursion RLS).
create or replace function public.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where organization_id = org and user_id = auth.uid());
$$;

create or replace function public.has_org_role(org uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where organization_id = org and user_id = auth.uid() and role = any (roles));
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.pharmacies enable row level security;
alter table public.data_imports enable row level security;

create policy "profil personnel" on public.profiles for select using (id = auth.uid());
create policy "profil personnel modifiable" on public.profiles for update using (id = auth.uid());

create policy "organisations des membres" on public.organizations for select using (public.is_org_member(id));
create policy "organisations modifiables par titulaires" on public.organizations for update
  using (public.has_org_role(id, array['owner', 'admin']::public.member_role[]));

create policy "membres visibles dans l'organisation" on public.memberships for select using (public.is_org_member(organization_id));
create policy "membres gérés par titulaires" on public.memberships for all
  using (public.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));

create policy "officines des membres" on public.pharmacies for select using (public.is_org_member(organization_id));
create policy "officines gérées par titulaires" on public.pharmacies for all
  using (public.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));

create policy "imports des membres" on public.data_imports for select
  using (exists (select 1 from pharmacies p where p.id = pharmacy_id and public.is_org_member(p.organization_id)));

-- À l'inscription : profil + organisation + première officine + rôle titulaire.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  org_id uuid;
  ph_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'pharmacy_name'), ''), 'Ma pharmacie');
begin
  insert into profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into organizations (name) values (ph_name) returning id into org_id;
  insert into memberships (organization_id, user_id, role) values (org_id, new.id, 'owner');
  insert into pharmacies (organization_id, name) values (org_id, ph_name);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
