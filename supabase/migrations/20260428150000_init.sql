-- Supabase Migration: Initial Schema
-- Generated at: 2026-04-28T15:00:00Z

-- Users Table
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

-- Inventory Table
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

-- Page Content Table
CREATE TABLE IF NOT EXISTS page_content (
  id SERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(section, key)
);

-- Services Table
CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  title TEXT,
  description TEXT,
  icon TEXT,
  order_index INTEGER DEFAULT 0
);

-- Plans Table
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT,
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

-- Ensure UNIQUE constraints exist for ON CONFLICT (idempotent setup)
DO $$
BEGIN
    -- For services.title
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'services_title_key') THEN
        ALTER TABLE services ADD CONSTRAINT services_title_key UNIQUE (title);
    END IF;

    -- For plans.name
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_name_key') THEN
        ALTER TABLE plans ADD CONSTRAINT plans_name_key UNIQUE (name);
    END IF;

    -- For page_content (section, key)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'page_content_section_key_key') THEN
        ALTER TABLE page_content ADD CONSTRAINT page_content_section_key_key UNIQUE (section, key);
    END IF;
END $$;

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT,
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

-- Plan Clicks Table
CREATE TABLE IF NOT EXISTS plan_clicks (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER REFERENCES plans(id),
  click_date DATE DEFAULT CURRENT_DATE,
  day_of_week INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_clicks ENABLE ROW LEVEL SECURITY;

-- Create policies (Idempotent: Drop if exists then create)
DROP POLICY IF EXISTS "Allow all operations for users" ON users;
CREATE POLICY "Allow all operations for users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for inventory" ON inventory;
CREATE POLICY "Allow all operations for inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for page_content" ON page_content;
CREATE POLICY "Allow all operations for page_content" ON page_content FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for services" ON services;
CREATE POLICY "Allow all operations for services" ON services FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for plans" ON plans;
CREATE POLICY "Allow all operations for plans" ON plans FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for customers" ON customers;
CREATE POLICY "Allow all operations for customers" ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all operations for plan_clicks" ON plan_clicks;
CREATE POLICY "Allow all operations for plan_clicks" ON plan_clicks FOR ALL USING (true) WITH CHECK (true);
