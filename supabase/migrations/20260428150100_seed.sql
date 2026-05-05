-- =============================================
-- InfraLink Eventos — Supabase Migration Script
-- Execute este SQL no SQL Editor do Supabase
-- =============================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  two_factor_secret TEXT,
  two_factor_enabled INTEGER DEFAULT 0,
  reset_token TEXT,
  reset_token_expiry BIGINT
);

-- 2. INVENTORY TABLE
CREATE TABLE IF NOT EXISTS inventory (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  brand TEXT,
  purchase_date TEXT,
  serial_number TEXT,
  supplier TEXT,
  price NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'Ativo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PAGE CONTENT TABLE
CREATE TABLE IF NOT EXISTS page_content (
  id BIGSERIAL PRIMARY KEY,
  section TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(section, key)
);

-- 4. SERVICES TABLE
CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  title TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  order_index INTEGER DEFAULT 0
);

-- 5. PLANS TABLE
CREATE TABLE IF NOT EXISTS plans (
  id BIGSERIAL PRIMARY KEY,
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

-- 6. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT,
  event_name TEXT,
  location TEXT,
  event_date TEXT,
  budget NUMERIC(10,2) DEFAULT 0,
  cost NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'Pendente',
  plan_id BIGINT REFERENCES plans(id) ON DELETE SET NULL,
  phone TEXT,
  email TEXT,
  start_date TEXT,
  end_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PLAN CLICKS TABLE
CREATE TABLE IF NOT EXISTS plan_clicks (
  id BIGSERIAL PRIMARY KEY,
  plan_id BIGINT REFERENCES plans(id) ON DELETE CASCADE,
  click_date DATE DEFAULT CURRENT_DATE,
  day_of_week INTEGER
);

-- =============================================
-- SEED DATA
-- =============================================

-- Seed Users (password: admin123 — bcrypt hash)
INSERT INTO users (username, password_hash) VALUES
  ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'),
  ('infralinkeventos@gmail.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy')
ON CONFLICT (username) DO NOTHING;

-- Seed Page Content
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

-- Seed Plans
INSERT INTO plans (name, description, price, period, features, badge_text, highlight_color, is_featured, cta_text, cta_url, order_index) VALUES
  ('Starter', 'Ideal para eventos pequenos com até 200 pessoas', 'R$ 890', 'por evento', 'Internet via satélite 50 Mbps,Até 3 pontos de acesso Wi-Fi,Suporte remoto durante evento,Relatório de uso pós-evento', '', '#0066FF', 0, 'Contratar plano', 'https://wa.me/5535988019507?text=Olá!%20Tenho%20interesse%20no%20Plano%20Starter%20para%20meu%20evento.', 0),
  ('Professional', 'Para eventos médios de 200 a 1.000 pessoas com infraestrutura robusta', 'R$ 1.990', 'por evento', 'Internet via satélite 150 Mbps,Até 10 pontos de acesso Wi-Fi,Gerenciamento de rede em tempo real,Estabilidade garantida para pagamentos,Banco de baterias incluso,Suporte presencial no evento', '★ Mais Popular', '#00FF88', 1, 'Contratar plano', 'https://wa.me/5535988019507?text=Olá!%20Tenho%20interesse%20no%20Plano%20Professional%20para%20meu%20evento.', 1),
  ('Enterprise', 'Solução completa para grandes eventos e festivais acima de 1.000 pessoas', 'Sob consulta', 'personalizado', 'Internet via satélite dedicada ilimitada,Pontos de acesso ilimitados,NOC dedicado 24/7,Redundância de link automática,Banco de baterias de alta capacidade,Equipe técnica presencial completa,SLA 99.9% de uptime garantido', 'Premium', '#0066FF', 0, 'Solicitar proposta', 'https://wa.me/5535988019507?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento%20para%20o%20Plano%20Enterprise.', 2)
ON CONFLICT (name) DO NOTHING;

-- Seed Services
INSERT INTO services (title, description, icon, order_index) VALUES
  ('Internet Dedicada', 'Link exclusivo para o seu evento, sem oscilações e com garantia de banda.', 'Wifi', 0),
  ('Gerenciamento de Rede', 'Monitoramento em tempo real para garantir máxima segurança e performance.', 'Activity', 1),
  ('Estabilidade para Pagamentos', 'Rede exclusiva para máquinas de cartão e caixas, evitando filas e perdas nas vendas.', 'Zap', 2),
  ('Banco de Baterias', 'Nobreaks de alta performance inclusos para garantir energia constante.', 'Battery', 3),
  ('Suporte Presencial', 'Equipe técnica disponível durante todo o evento para garantir estabilidade.', 'Headset', 4)
ON CONFLICT (title) DO NOTHING;

-- =============================================
-- ENABLE ROW LEVEL SECURITY (Optional)
-- =============================================
-- RLS is disabled by default. Since the server uses the service_role key,
-- it bypasses RLS anyway. Enable RLS only if you plan to use anon key
-- with policies for public access.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_clicks ENABLE ROW LEVEL SECURITY;

-- Public read access for public-facing tables
CREATE POLICY "Allow public read on page_content" ON page_content FOR SELECT USING (true);
CREATE POLICY "Allow public read on plans" ON plans FOR SELECT USING (true);
CREATE POLICY "Allow public read on services" ON services FOR SELECT USING (true);
CREATE POLICY "Allow public insert on plan_clicks" ON plan_clicks FOR INSERT WITH CHECK (true);

-- Service role has full access by default (bypasses RLS)
