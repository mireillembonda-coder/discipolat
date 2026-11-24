-- Durcissement après les contrôles Supabase (security & performance advisors).
-- 1. Fonctions SECURITY DEFINER déplacées dans un schéma privé, non exposé par l'API.
-- 2. auth.uid() évalué une seule fois par requête dans les politiques.
-- 3. Une seule politique permissive par action ; index sur les clés étrangères.

create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create or replace function app_private.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships where organization_id = org and user_id = (select auth.uid()));
$$;

create or replace function app_private.has_org_role(org uuid, roles public.member_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.memberships where organization_id = org and user_id = (select auth.uid()) and role = any (roles));
$$;

revoke all on function app_private.is_org_member(uuid) from public, anon;
revoke all on function app_private.has_org_role(uuid, public.member_role[]) from public, anon;
grant execute on function app_private.is_org_member(uuid) to authenticated;
grant execute on function app_private.has_org_role(uuid, public.member_role[]) to authenticated;

-- Politiques recréées
drop policy "profil personnel" on public.profiles;
drop policy "profil personnel modifiable" on public.profiles;
drop policy "organisations des membres" on public.organizations;
drop policy "organisations modifiables par titulaires" on public.organizations;
drop policy "membres visibles dans l'organisation" on public.memberships;
drop policy "membres gérés par titulaires" on public.memberships;
drop policy "officines des membres" on public.pharmacies;
drop policy "officines gérées par titulaires" on public.pharmacies;
drop policy "imports des membres" on public.data_imports;

create policy "profil personnel" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profil personnel modifiable" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "organisations des membres" on public.organizations for select to authenticated using (app_private.is_org_member(id));
create policy "organisations modifiables par titulaires" on public.organizations for update to authenticated
  using (app_private.has_org_role(id, array['owner', 'admin']::public.member_role[]))
  with check (app_private.has_org_role(id, array['owner', 'admin']::public.member_role[]));

create policy "membres visibles" on public.memberships for select to authenticated using (app_private.is_org_member(organization_id));
create policy "membres ajoutés par titulaires" on public.memberships for insert to authenticated
  with check (app_private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));
create policy "membres modifiés par titulaires" on public.memberships for update to authenticated
  using (app_private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]))
  with check (app_private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));
create policy "membres retirés par titulaires" on public.memberships for delete to authenticated
  using (app_private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));

create policy "officines visibles" on public.pharmacies for select to authenticated using (app_private.is_org_member(organization_id));
create policy "officines ajoutées par titulaires" on public.pharmacies for insert to authenticated
  with check (app_private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));
create policy "officines modifiées par titulaires" on public.pharmacies for update to authenticated
  using (app_private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]))
  with check (app_private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));
create policy "officines supprimées par titulaires" on public.pharmacies for delete to authenticated
  using (app_private.has_org_role(organization_id, array['owner', 'admin']::public.member_role[]));

create policy "imports visibles" on public.data_imports for select to authenticated
  using (exists (select 1 from public.pharmacies p where p.id = pharmacy_id and app_private.is_org_member(p.organization_id)));

drop function public.is_org_member(uuid);
drop function public.has_org_role(uuid, public.member_role[]);

-- Fonction du trigger d'inscription : jamais appelable via l'API.
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
revoke all on function app_private.handle_new_user() from public, anon, authenticated;

drop trigger on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app_private.handle_new_user();
drop function public.handle_new_user();

create index memberships_user_idx on public.memberships (user_id);
create index data_imports_pharmacy_idx on public.data_imports (pharmacy_id);
create index data_imports_created_by_idx on public.data_imports (created_by);
