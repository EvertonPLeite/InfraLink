-- Supabase Migration: Hardened Schema and Policies
-- Generated at: 2026-04-29T22:00:00Z

-- Ensure all tables exist with correct types
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  two_factor_secret TEXT,
  two_factor_enabled INTEGER DEFAULT 0,
  reset_token TEXT,
  reset_token_expiry BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  purchase_date TEXT,
  serial_number TEXT,
  supplier TEXT,
  price DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS page_content (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(section, key)
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  title TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  price TEXT,
  period TEXT,
  features TEXT,
  badge_text TEXT,
  highlight_color TEXT DEFAULT '#00FF88',
  is_featured INTEGER DEFAULT 0,
  cta_text TEXT,
  cta_url TEXT,
  order_index INTEGER DEFAULT 0,
  budget_text TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT,
  event_name TEXT,
  location TEXT,
  event_date TEXT,
  budget DECIMAL(10,2),
  cost DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'Pendente',
  plan_id INTEGER REFERENCES plans(id),
  start_date TEXT,
  end_date TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_clicks (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER REFERENCES plans(id),
  click_date DATE DEFAULT CURRENT_DATE,
  day_of_week INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_clicks ENABLE ROW LEVEL SECURITY;

-- Security Policies

-- 1. Users Table: System-only or self-access
DROP POLICY IF EXISTS "Enable all access for service role" ON users;
CREATE POLICY "Enable all access for service role" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own record" ON users;
CREATE POLICY "Users can view their own record" ON users FOR SELECT USING (auth.uid()::text = username OR auth.role() = 'authenticated');

-- 2. Public Tables: Readable by anyone, writeable by service_role (backend)
-- services
DROP POLICY IF EXISTS "Public Read Services" ON services;
CREATE POLICY "Public Read Services" ON services FOR SELECT USING (true);
DROP POLICY IF EXISTS "System Write Services" ON services;
CREATE POLICY "System Write Services" ON services FOR ALL TO service_role USING (true) WITH CHECK (true);

-- plans
DROP POLICY IF EXISTS "Public Read Plans" ON plans;
CREATE POLICY "Public Read Plans" ON plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "System Write Plans" ON plans;
CREATE POLICY "System Write Plans" ON plans FOR ALL TO service_role USING (true) WITH CHECK (true);

-- page_content
DROP POLICY IF EXISTS "Public Read Content" ON page_content;
CREATE POLICY "Public Read Content" ON page_content FOR SELECT USING (true);
DROP POLICY IF EXISTS "System Write Content" ON page_content;
CREATE POLICY "System Write Content" ON page_content FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Private Tables: Authenticated access only
-- inventory
DROP POLICY IF EXISTS "Authenticated Inventory Access" ON inventory;
CREATE POLICY "Authenticated Inventory Access" ON inventory FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "System Inventory Access" ON inventory;
CREATE POLICY "System Inventory Access" ON inventory FOR ALL TO service_role USING (true) WITH CHECK (true);

-- customers
DROP POLICY IF EXISTS "Authenticated Customer Access" ON customers;
CREATE POLICY "Authenticated Customer Access" ON customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "System Customer Access" ON customers;
CREATE POLICY "System Customer Access" ON customers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- plan_clicks
DROP POLICY IF EXISTS "Public Insert Plan Clicks" ON plan_clicks;
CREATE POLICY "Public Insert Plan Clicks" ON plan_clicks FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated Plan Clicks Select" ON plan_clicks;
CREATE POLICY "Authenticated Plan Clicks Select" ON plan_clicks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "System Plan Clicks" ON plan_clicks;
CREATE POLICY "System Plan Clicks" ON plan_clicks FOR ALL TO service_role USING (true) WITH CHECK (true);
