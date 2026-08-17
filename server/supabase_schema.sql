-- ==============================================================================
-- Ivory & Gold Events — Supabase Cloud Database Schema
-- Run this in your Supabase Project SQL Editor (https://app.supabase.com)
-- ==============================================================================

-- Create invoices table for permanent multi-tenant / workspace history
create table if not exists invoices (
  id uuid default gen_random_uuid() primary key,
  filename text not null unique,
  client_id text not null default 'default',
  invoice_num text default '',
  client_name text default '',
  format text not null check (format in ('pdf', 'xlsx')),
  size integer default 0,
  invoice_data jsonb not null,
  created_at timestamptz default now()
);

-- Indices for instant query response on workspace and filename
create index if not exists idx_invoices_client_id on invoices(client_id);
create index if not exists idx_invoices_created_at on invoices(created_at desc);

-- Disable Row Level Security or allow public read/write with anon key for this table
alter table invoices enable row level security;

-- Create policy to allow read/write via service role / anon key
create policy "Allow all operations for invoices"
  on invoices
  for all
  using (true)
  with check (true);
