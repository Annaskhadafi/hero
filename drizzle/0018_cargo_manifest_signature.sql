alter table hero_cargo_manifests
  add column if not exists signature_name text not null default '',
  add column if not exists signature_data_url text not null default '';
