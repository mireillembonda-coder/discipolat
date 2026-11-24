-- Durcissement après les contrôles Supabase (security & performance advisors).
-- Version sans suppression (aucun DROP) : objets déplacés ou modifiés en place.
-- 1. Fonctions SECURITY DEFINER déplacées dans un schéma privé, non exposé par l'API
--    (les politiques et le trigger suivent automatiquement les fonctions déplacées).
-- 2. auth.uid() évalué une seule fois par requête ; politiques limitées au rôle authenticated.
-- 3. Index sur les clés étrangères.

create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

alter function public.is_org_member(uuid) set schema app_private;
alter function public.has_org_role(uuid, public.member_role[]) set schema app_private;
alter function public.handle_new_user() set schema app_private;

create or replace function app_private.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships where organization_id = org and user_id = (select auth.uid()));
$$;

create or replace function app_private.has_org_role(org uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships where organization_id = org and user_id = (select auth.uid()) and role = any (roles));
$$;

create or replace function app_private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  org_id uuid;
  ph_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'pharmacy_name'), ''), 'Ma pharmacie');
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data ->> 'full_name');
  insert into public.organizations (name) values (ph_name) returning id into org_id;
  insert into public.memberships (organization_id, user_id, role) values (org_id, new.id, 'owner');
  insert into public.pharmacies (organization_id, name) values (org_id, ph_name);
  return new;
end;
$$;

revoke all on function app_private.is_org_member(uuid) from public, anon;
revoke all on function app_private.has_org_role(uuid, public.member_role[]) from public, anon;
revoke all on function app_private.handle_new_user() from public, anon, authenticated;
grant execute on function app_private.is_org_member(uuid) to authenticated;
grant execute on function app_private.has_org_role(uuid, public.member_role[]) to authenticated;

alter policy "profil personnel" on public.profiles to authenticated using (id = (select auth.uid()));
alter policy "profil personnel modifiable" on public.profiles to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy "organisations des membres" on public.organizations to authenticated;
alter policy "organisations modifiables par titulaires" on public.organizations to authenticated;
alter policy "membres visibles dans l'organisation" on public.memberships to authenticated;
alter policy "membres gérés par titulaires" on public.memberships to authenticated;
alter policy "officines des membres" on public.pharmacies to authenticated;
alter policy "officines gérées par titulaires" on public.pharmacies to authenticated;
alter policy "imports des membres" on public.data_imports to authenticated;

create index if not exists memberships_user_idx on public.memberships (user_id);
create index if not exists data_imports_pharmacy_idx on public.data_imports (pharmacy_id);
create index if not exists data_imports_created_by_idx on public.data_imports (created_by);
