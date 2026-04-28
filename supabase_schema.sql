-- Supabase Schema Migration (PostgreSQL)

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
  title TEXT UNIQUE,
  description TEXT,
  icon TEXT,
  order_index INTEGER DEFAULT 0
);

-- Plans Table
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE,
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

-- Initial Content Seed
INSERT INTO page_content (section, key, value) VALUES
('hero', 'title', 'Seu <span class="text-white/40">evento</span> não pode <span class="gradient-text">parar.</span>'),
('hero', 'subtitle', 'Infraestrutura profissional de conectividade para eventos'),
('hero', 'cta', 'Fale no WhatsApp'),
('hero', 'stat1_val', '99.9%'),
('hero', 'stat1_label', 'Uptime'),
('hero', 'stat2_val', '500+'),
('hero', 'stat2_label', 'Eventos'),
('hero', 'stat3_val', '24/7'),
('hero', 'stat3_label', 'Suporte'),
('hero', 'stat4_val', '< 10ms'),
('hero', 'stat4_label', 'Latência'),
('contact', 'phone', '+55 (35) 98801-9507'),
('contact', 'email', 'contato@infralink.com.br'),
('contact', 'location', 'Pouso Alegre, Minas Gerais'),
('contact', 'whatsapp_url', 'https://wa.me/5535988019507'),
('general', 'logo_url', ''),
('general', 'site_name', 'InfraLink.Eventos'),
('footer', 'copyright', 'Todos os direitos reservados.'),
('footer', 'description', 'Sua infraestrutura de rede para eventos com segurança e estabilidade.')
ON CONFLICT (section, key) DO NOTHING;

-- Initial Plans Seed
INSERT INTO plans (name, description, price, period, features, badge_text, highlight_color, is_featured, cta_text, cta_url, order_index) VALUES
('Starter', 'Ideal para eventos pequenos com até 200 pessoas', 'R$ 890', 'por evento', 'Internet via satélite 50 Mbps,Até 3 pontos de acesso Wi-Fi,Suporte remoto durante evento,Relatório de uso pós-evento', '', '#0066FF', 0, 'Contratar plano', '#', 0),
('Professional', 'Para eventos médios de 200 a 1.000 pessoas com infraestrutura robusta', 'R$ 1.990', 'por evento', 'Internet via satélite 150 Mbps,Até 10 pontos de acesso Wi-Fi,Gerenciamento de rede em tempo real,Estabilidade garantida para pagamentos,Banco de baterias incluso,Suporte presencial no evento', '★ Mais Popular', '#00FF88', 1, 'Contratar plano', '#', 1),
('Enterprise', 'Solução completa para grandes eventos e festivais acima de 1.000 pessoas', 'Sob consulta', 'personalizado', 'Internet via satélite dedicada ilimitada,Pontos de acesso ilimitados,NOC dedicado 24/7,Redundância de link automática,Banco de baterias de alta capacidade,Equipe técnica presencial completa,SLA 99.9% de uptime garantido', 'Premium', '#0066FF', 0, 'Solicitar proposta', '#', 2)
ON CONFLICT (name) DO NOTHING;

-- Initial Services Seed
INSERT INTO services (title, description, icon, order_index) VALUES
('Internet Dedicada', 'Link exclusivo para o seu evento, sem oscilações e com garantia de banda.', 'Wifi', 0),
('Gerenciamento de Rede', 'Monitoramento em tempo real para garantir máxima segurança e performance.', 'Activity', 1),
('Estabilidade para Pagamentos', 'Rede exclusiva para máquinas de cartão e caixas, evitando filas e perdas nas vendas.', 'Zap', 2),
('Banco de Baterias', 'Nobreaks de alta performance inclusos para garantir energia constante.', 'Battery', 3),
('Suporte Presencial', 'Equipe técnica disponível durante todo o evento para garantir estabilidade.', 'Headset', 4)
ON CONFLICT (title) DO NOTHING;

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

