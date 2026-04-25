-- HERO target schema derived from DATA HERO.xlsx
-- Modules: master data, organization structure, user management

create table if not exists md_departments (
    department_id varchar(120) primary key,
    department_name varchar(150) not null unique,
    is_active boolean not null default true,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp
);

create table if not exists md_sections (
    section_id varchar(160) primary key,
    department_id varchar(120) not null,
    section_name varchar(150) not null,
    is_active boolean not null default true,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    constraint fk_md_sections_department
        foreign key (department_id) references md_departments (department_id),
    constraint uq_md_sections_department_name
        unique (department_id, section_name)
);

create table if not exists md_sites (
    site_id varchar(120) primary key,
    site_name varchar(150) not null unique,
    is_active boolean not null default true,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp
);

create table if not exists md_work_locations (
    work_location_id varchar(160) primary key,
    work_location_name varchar(180) not null unique,
    is_active boolean not null default true,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp
);

create table if not exists md_job_levels (
    job_level_code varchar(20) primary key,
    job_level_name varchar(80) not null unique
);

create table if not exists md_genders (
    gender_code varchar(20) primary key,
    gender_name varchar(40) not null unique
);

create table if not exists md_age_bands (
    age_band_code varchar(20) primary key,
    age_band_name varchar(80) not null unique
);

create table if not exists md_service_bands (
    service_band_code varchar(20) primary key,
    service_band_name varchar(80) not null unique
);

create table if not exists md_educations (
    education_code varchar(20) primary key,
    education_name varchar(150) not null unique
);

create table if not exists md_employee_statuses (
    employee_status_code varchar(20) primary key,
    employee_status_name varchar(60) not null unique
);

create table if not exists md_location_categories (
    location_category_code varchar(20) primary key,
    location_category_name varchar(60) not null unique
);

create table if not exists md_positions (
    position_id varchar(180) primary key,
    level_name varchar(60) not null,
    rank_name varchar(80) not null,
    job_level_code varchar(20),
    employee_status_code varchar(20),
    is_managerial boolean not null default false,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    constraint fk_md_positions_job_level
        foreign key (job_level_code) references md_job_levels (job_level_code),
    constraint fk_md_positions_employee_status
        foreign key (employee_status_code) references md_employee_statuses (employee_status_code),
    constraint uq_md_positions_signature
        unique (level_name, rank_name, job_level_code, employee_status_code)
);

create table if not exists org_nodes (
    org_node_id varchar(255) primary key,
    parent_org_node_id varchar(255),
    node_type varchar(40) not null,
    node_name varchar(180) not null,
    department_id varchar(120),
    section_id varchar(160),
    site_id varchar(120),
    work_location_id varchar(160),
    hierarchy_level integer not null,
    path_text varchar(500) not null,
    is_active boolean not null default true,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    constraint fk_org_nodes_parent
        foreign key (parent_org_node_id) references org_nodes (org_node_id),
    constraint fk_org_nodes_department
        foreign key (department_id) references md_departments (department_id),
    constraint fk_org_nodes_section
        foreign key (section_id) references md_sections (section_id),
    constraint fk_org_nodes_site
        foreign key (site_id) references md_sites (site_id),
    constraint fk_org_nodes_work_location
        foreign key (work_location_id) references md_work_locations (work_location_id),
    constraint ck_org_nodes_type
        check (node_type in ('company', 'department', 'section', 'site', 'work_location')),
    constraint ck_org_nodes_level
        check (hierarchy_level between 0 and 4)
);

create index if not exists idx_org_nodes_parent on org_nodes (parent_org_node_id);
create index if not exists idx_org_nodes_section on org_nodes (section_id);
create index if not exists idx_org_nodes_site on org_nodes (site_id);
create index if not exists idx_org_nodes_work_location on org_nodes (work_location_id);

create table if not exists um_users (
    user_id varchar(50) primary key,
    employee_id varchar(50) not null unique,
    full_name varchar(180) not null,
    email varchar(180),
    email_password_migration varchar(255),
    department_id varchar(120),
    section_id varchar(160),
    site_id varchar(120),
    work_location_id varchar(160),
    position_id varchar(180),
    org_node_id varchar(255),
    join_date date,
    birth_date date,
    gender_code varchar(20),
    age_band_code varchar(20),
    service_band_code varchar(20),
    education_code varchar(20),
    demographic_employee_status_code varchar(20),
    location_category_code varchar(20),
    account_status varchar(30) not null default 'active',
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    constraint fk_um_users_department
        foreign key (department_id) references md_departments (department_id),
    constraint fk_um_users_section
        foreign key (section_id) references md_sections (section_id),
    constraint fk_um_users_site
        foreign key (site_id) references md_sites (site_id),
    constraint fk_um_users_work_location
        foreign key (work_location_id) references md_work_locations (work_location_id),
    constraint fk_um_users_position
        foreign key (position_id) references md_positions (position_id),
    constraint fk_um_users_org_node
        foreign key (org_node_id) references org_nodes (org_node_id),
    constraint fk_um_users_gender
        foreign key (gender_code) references md_genders (gender_code),
    constraint fk_um_users_age_band
        foreign key (age_band_code) references md_age_bands (age_band_code),
    constraint fk_um_users_service_band
        foreign key (service_band_code) references md_service_bands (service_band_code),
    constraint fk_um_users_education
        foreign key (education_code) references md_educations (education_code),
    constraint fk_um_users_demographic_status
        foreign key (demographic_employee_status_code) references md_employee_statuses (employee_status_code),
    constraint fk_um_users_location_category
        foreign key (location_category_code) references md_location_categories (location_category_code),
    constraint ck_um_users_account_status
        check (account_status in ('active', 'inactive', 'pending'))
);

create unique index if not exists uq_um_users_email on um_users (email) where email is not null;
create index if not exists idx_um_users_org_node on um_users (org_node_id);
create index if not exists idx_um_users_position on um_users (position_id);
create index if not exists idx_um_users_department on um_users (department_id);

-- Recommended security hardening after migration:
-- 1. remove or nullify email_password_migration after account provisioning
-- 2. provision authentication credentials in auth system, not in um_users
-- 3. add row-level security / permission mapping based on org_node_id ancestry
