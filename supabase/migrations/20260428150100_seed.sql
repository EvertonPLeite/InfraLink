-- Supabase Migration: Seed Data
-- Generated at: 2026-04-28T15:00:00Z

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
ON CONFLICT (section, key) DO UPDATE SET value = EXCLUDED.value;

-- Initial Plans Seed
INSERT INTO plans (name, description, price, period, features, badge_text, highlight_color, is_featured, cta_text, cta_url, order_index) VALUES
('Starter', 'Ideal para eventos pequenos com até 200 pessoas', 'R$ 890', 'por evento', 'Internet via satélite 50 Mbps,Até 3 pontos de acesso Wi-Fi,Suporte remoto durante evento,Relatório de uso pós-evento', '', '#0066FF', 0, 'Contratar plano', 'https://wa.me/5535988019507?text=Olá!%20Tenho%20interesse%20no%20Plano%20Starter%20para%20meu%20evento.', 0),
('Professional', 'Para eventos médios de 200 a 1.000 pessoas com infraestrutura robusta', 'R$ 1.990', 'por evento', 'Internet via satélite 150 Mbps,Até 10 pontos de acesso Wi-Fi,Gerenciamento de rede em tempo real,Estabilidade garantida para pagamentos,Banco de baterias incluso,Suporte presencial no evento', '★ Mais Popular', '#00FF88', 1, 'Contratar plano', 'https://wa.me/5535988019507?text=Olá!%20Tenho%20interesse%20no%20Plano%20Professional%20para%20meu%20evento.', 1),
('Enterprise', 'Solução completa para grandes eventos e festivais acima de 1.000 pessoas', 'Sob consulta', 'personalizado', 'Internet via satélite dedicada ilimitada,Pontos de acesso ilimitados,NOC dedicado 24/7,Redundância de link automática,Banco de baterias de alta capacidade,Equipe técnica presencial completa,SLA 99.9% de uptime garantido', 'Premium', '#0066FF', 0, 'Solicitar proposta', 'https://wa.me/5535988019507?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento%20para%20o%20Plano%20Enterprise.', 2)
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  period = EXCLUDED.period,
  features = EXCLUDED.features,
  cta_url = EXCLUDED.cta_url;

-- Initial Services Seed
INSERT INTO services (title, description, icon, order_index) VALUES
('Internet Dedicada', 'Link exclusivo para o seu evento, sem oscilações e com garantia de banda.', 'Wifi', 0),
('Gerenciamento de Rede', 'Monitoramento em tempo real para garantir máxima segurança e performance.', 'Activity', 1),
('Estabilidade para Pagamentos', 'Rede exclusiva para máquinas de cartão e caixas, evitando filas e perdas nas vendas.', 'Zap', 2),
('Banco de Baterias', 'Nobreaks de alta performance inclusos para garantir energia constante.', 'Battery', 3),
('Suporte Presencial', 'Equipe técnica disponível durante todo o evento para garantir estabilidade.', 'Headset', 4)
ON CONFLICT (title) DO UPDATE SET 
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;
