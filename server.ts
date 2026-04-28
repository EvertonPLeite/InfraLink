import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API Keys and Secrets
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'infralink-super-secret-key';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// SMTP Config
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

const transporter = nodemailer.createTransport(smtpConfig);

// Helper to send email
async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  if (!smtpConfig.host || !smtpConfig.auth.user) {
    console.log('--- EMAIL SIMULATION (SMTP NOT CONFIGURED) ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html}`);
    console.log('----------------------------------------------');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"InfraLink Eventos" <noreply@infralink.com.br>',
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error('Failed to send email:', err);
    throw err;
  }
}

// Supabase Setup
let supabase: any = null;

const isValidSupabaseConfig = (url: string | undefined, key: string | undefined) => {
  if (!url || !key || url.trim() === '' || key.trim() === '') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
};

if (isValidSupabaseConfig(SUPABASE_URL, SUPABASE_KEY)) {
  try {
    // Use service role key if available to bypass RLS on server-side
    const keyToUse = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
    supabase = createClient(SUPABASE_URL!, keyToUse!);
    console.log(`Supabase client initialized successfully using ${SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon'} key`);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    supabase = null;
  }
} else {
  console.log('Supabase credentials missing, invalid or empty. Falling back to SQLite.');
}

// Database Setup (SQLite fallback)
const db = new Database('database.sqlite');
db.pragma('journal_mode = WAL');

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    two_factor_secret TEXT,
    two_factor_enabled INTEGER DEFAULT 0,
    reset_token TEXT,
    reset_token_expiry INTEGER
  );
`);

// Migrations for users table
try {
  const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
  const hasResetToken = columns.some(c => c.name === 'reset_token');
  const hasResetExpiry = columns.some(c => c.name === 'reset_token_expiry');
  const has2FASecret = columns.some(c => c.name === 'two_factor_secret');
  const has2FAEnabled = columns.some(c => c.name === 'two_factor_enabled');

  if (!hasResetToken) {
    db.prepare('ALTER TABLE users ADD COLUMN reset_token TEXT').run();
  }
  if (!hasResetExpiry) {
    db.prepare('ALTER TABLE users ADD COLUMN reset_token_expiry INTEGER').run();
  }
  if (!has2FASecret) {
    db.prepare('ALTER TABLE users ADD COLUMN two_factor_secret TEXT').run();
  }
  if (!has2FAEnabled) {
    db.prepare('ALTER TABLE users ADD COLUMN two_factor_enabled INTEGER DEFAULT 0').run();
  }
} catch (e) {
  console.error("Users migration error:", e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT,
    purchase_date TEXT,
    serial_number TEXT,
    supplier TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'Ativo',
    created_at TEXT DEFAULT (DATETIME('now'))
  );

  CREATE TABLE IF NOT EXISTS page_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT,
    key TEXT,
    value TEXT,
    UNIQUE(section, key)
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    icon TEXT,
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    location TEXT,
    event_date TEXT,
    budget DECIMAL(10,2),
    cost DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'Pendente',
    plan_id INTEGER,
    created_at TEXT DEFAULT (DATETIME('now'))
  );

  CREATE TABLE IF NOT EXISTS plan_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER,
    click_date TEXT DEFAULT (DATE('now')),
    day_of_week INTEGER,
    FOREIGN KEY(plan_id) REFERENCES plans(id)
  );
`);

// Check if missing columns exist in plans table, if not add them (Migration)
try {
  const planColumns = db.prepare("PRAGMA table_info(plans)").all() as any[];
  const requiredColumns = [
    { name: 'period', type: 'TEXT' },
    { name: 'features', type: 'TEXT' },
    { name: 'badge_text', type: 'TEXT' },
    { name: 'highlight_color', type: 'TEXT DEFAULT "#00FF88"' },
    { name: 'is_featured', type: 'INTEGER DEFAULT 0' },
    { name: 'cta_text', type: 'TEXT' },
    { name: 'cta_url', type: 'TEXT' },
    { name: 'budget_text', type: 'TEXT' }
  ];

  requiredColumns.forEach(reqCol => {
    if (!planColumns.some(col => col.name === reqCol.name)) {
      db.prepare(`ALTER TABLE plans ADD COLUMN ${reqCol.name} ${reqCol.type}`).run();
      console.log(`Added missing column ${reqCol.name} to plans table`);
    }
  });
} catch (e) {
  console.error("Plans migration error:", e);
}

// Check if icon column exists, if not add it (Migration)
try {
  const columns = db.prepare("PRAGMA table_info(services)").all() as any[];
  if (!columns.some(col => col.name === 'icon')) {
    db.prepare('ALTER TABLE services ADD COLUMN icon TEXT').run();
  }
} catch (e) {
  console.error("Services migration error:", e);
}

  // Check if cost column exists in customers table, if not add it (Migration)
  try {
    const customerColumns = db.prepare("PRAGMA table_info(customers)").all() as any[];
    const requiredCols = [
      { name: 'cost', type: 'DECIMAL(10,2) DEFAULT 0' },
      { name: 'start_date', type: 'TEXT' },
      { name: 'end_date', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'plan_id', type: 'INTEGER' }
    ];
    
    requiredCols.forEach(col => {
      if (!customerColumns.some(c => c.name === col.name)) {
        db.prepare(`ALTER TABLE customers ADD COLUMN ${col.name} ${col.type}`).run();
        console.log(`Added missing column ${col.name} to customers table`);
      }
    });
  } catch (e) {
    console.error("Customers migration error:", e);
  }

// Seed Initial Data
const seedUsers = async () => {
  const users = ['admin', 'infralinkeventos@gmail.com'];
  const password = 'admin123';
  const hash = bcrypt.hashSync(password, 10);

  for (const username of users) {
    // SQLite
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!existingUser) {
      console.log(`Seeding user ${username} into SQLite...`);
      db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    }

    // Supabase
    if (supabase) {
      const { data, error } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
      if (!error && !data) {
        console.log(`Seeding user ${username} into Supabase...`);
        const { error: insertError } = await supabase.from('users').insert({ username, password_hash: hash });
        if (insertError) console.error(`Error seeding user ${username} to Supabase:`, insertError.message, insertError.code, insertError.hint);
      }
    }
  }
};

const seedContent = [
  ['hero', 'title', 'Seu <span class="text-white/40">evento</span> não pode <span class="gradient-text">parar.</span>'],
  ['hero', 'subtitle', 'Infraestrutura profissional de conectividade para eventos'],
  ['hero', 'cta', 'Fale no WhatsApp'],
  ['hero', 'stat1_val', '99.9%'],
  ['hero', 'stat1_label', 'Uptime'],
  ['hero', 'stat2_val', '500+'],
  ['hero', 'stat2_label', 'Eventos'],
  ['hero', 'stat3_val', '24/7'],
  ['hero', 'stat3_label', 'Suporte'],
  ['hero', 'stat4_val', '< 10ms'],
  ['hero', 'stat4_label', 'Latência'],
  ['contact', 'phone', '+55 (35) 98801-9507'],
  ['contact', 'email', 'contato@infralink.com.br'],
  ['contact', 'location', 'Pouso Alegre, Minas Gerais'],
  ['contact', 'whatsapp_url', 'https://wa.me/5535988019507'],
  ['general', 'logo_url', ''],
  ['general', 'site_name', 'InfraLink.Eventos'],
  ['footer', 'copyright', 'Todos os direitos reservados.'],
  ['footer', 'description', 'Sua infraestrutura de rede para eventos com segurança e estabilidade.']
];

const insertContent = db.prepare('INSERT OR IGNORE INTO page_content (section, key, value) VALUES (?, ?, ?)');
seedContent.forEach(c => insertContent.run(c[0], c[1], c[2]));

  // Seed Initial Data
  const seedPlans = async () => {
    try {
      const sqliteCount: any = db.prepare('SELECT COUNT(*) as count FROM plans').get();
      if (sqliteCount.count === 0) {
        console.log('Seeding plans into SQLite...');
        const insertPlan = db.prepare('INSERT INTO plans (name, description, price, period, features, badge_text, highlight_color, is_featured, cta_text, cta_url, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        insertPlan.run('Starter', 'Ideal para eventos pequenos com até 200 pessoas', 'R$ 890', 'por evento', 'Internet via satélite 50 Mbps,Até 3 pontos de acesso Wi-Fi,Suporte remoto durante evento,Relatório de uso pós-evento', '', '#0066FF', 0, 'Contratar plano', '#', 0);
        insertPlan.run('Professional', 'Para eventos médios de 200 a 1.000 pessoas com infraestrutura robusta', 'R$ 1.990', 'por evento', 'Internet via satélite 150 Mbps,Até 10 pontos de acesso Wi-Fi,Gerenciamento de rede em tempo real,Estabilidade garantida para pagamentos,Banco de baterias incluso,Suporte presencial no evento', '★ Mais Popular', '#00FF88', 1, 'Contratar plano', '#', 1);
        insertPlan.run('Enterprise', 'Solução completa para grandes eventos e festivais acima de 1.000 pessoas', 'Sob consulta', 'personalizado', 'Internet via satélite dedicada ilimitada,Pontos de acesso ilimitados,NOC dedicado 24/7,Redundância de link automática,Banco de baterias de alta capacidade,Equipe técnica presencial completa,SLA 99.9% de uptime garantido', 'Premium', '#0066FF', 0, 'Solicitar proposta', '#', 2);
      }

      if (supabase) {
        console.log('Checking Supabase plans...');
        const { data: supabasePlans, error: countError } = await supabase.from('plans').select('id', { count: 'exact', head: true });
        
        if (!countError && (!supabasePlans || supabasePlans.length === 0)) {
          console.log('Seeding plans into Supabase...');
          const initialPlans = [
            { name: 'Starter', description: 'Ideal para eventos pequenos com até 200 pessoas', price: 'R$ 890', period: 'por evento', features: 'Internet via satélite 50 Mbps,Até 3 pontos de acesso Wi-Fi,Suporte remoto durante evento,Relatório de uso pós-evento', badge_text: '', highlight_color: '#0066FF', is_featured: 0, cta_text: 'Contratar plano', cta_url: '#', order_index: 0 },
            { name: 'Professional', description: 'Para eventos médios de 200 a 1.000 pessoas com infraestrutura robusta', price: 'R$ 1.990', period: 'por evento', features: 'Internet via satélite 150 Mbps,Até 10 pontos de acesso Wi-Fi,Gerenciamento de rede em tempo real,Estabilidade garantida para pagamentos,Banco de baterias incluso,Suporte presencial no evento', badge_text: '★ Mais Popular', highlight_color: '#00FF88', is_featured: 1, cta_text: 'Contratar plano', cta_url: '#', order_index: 1 },
            { name: 'Enterprise', description: 'Solução completa para grandes eventos e festivais acima de 1.000 pessoas', price: 'Sob consulta', period: 'personalizado', features: 'Internet via satélite dedicada ilimitada,Pontos de acesso ilimitados,NOC dedicado 24/7,Redundância de link automática,Banco de baterias de alta capacidade,Equipe técnica presencial completa,SLA 99.9% de uptime garantido', badge_text: 'Premium', highlight_color: '#0066FF', is_featured: 0, cta_text: 'Solicitar proposta', cta_url: '#', order_index: 2 }
          ];
          const { error: insertError } = await supabase.from('plans').insert(initialPlans);
          if (insertError) console.error('Error seeding plans to Supabase:', insertError.message, insertError.code, insertError.hint);
        }
      }
    } catch (err) {
      console.error('Seeding plans error:', err);
    }
  };

  const seedServices = async () => {
    try {
      const sqliteCount: any = db.prepare('SELECT COUNT(*) as count FROM services').get();
      if (sqliteCount.count === 0) {
        console.log('Seeding services into SQLite...');
        const insertService = db.prepare('INSERT INTO services (title, description, icon, order_index) VALUES (?, ?, ?, ?)');
        insertService.run('Internet Dedicada', 'Link exclusivo para o seu evento, sem oscilações e com garantia de banda.', 'Wifi', 0);
        insertService.run('Gerenciamento de Rede', 'Monitoramento em tempo real para garantir máxima segurança e performance.', 'Activity', 1);
        insertService.run('Estabilidade para Pagamentos', 'Rede exclusiva para máquinas de cartão e caixas, evitando filas e perdas nas vendas.', 'Zap', 2);
        insertService.run('Banco de Baterias', 'Nobreaks de alta performance inclusos para garantir energia constante.', 'Battery', 3);
        insertService.run('Suporte Presencial', 'Equipe técnica disponível durante todo o evento para garantir estabilidade.', 'Headset', 4);
      }

      if (supabase) {
        const { data: supabaseServices, error: countError } = await supabase.from('services').select('id', { count: 'exact', head: true });
        if (!countError && (!supabaseServices || supabaseServices.length === 0)) {
          console.log('Seeding services into Supabase...');
          const initialServices = [
            { title: 'Internet Dedicada', description: 'Link exclusivo para o seu evento, sem oscilações e com garantia de banda.', icon: 'Wifi', order_index: 0 },
            { title: 'Gerenciamento de Rede', description: 'Monitoramento em tempo real para garantir máxima segurança e performance.', icon: 'Activity', order_index: 1 },
            { title: 'Estabilidade para Pagamentos', description: 'Rede exclusiva para máquinas de cartão e caixas, evitando filas e perdas nas vendas.', icon: 'Zap', order_index: 2 },
            { title: 'Banco de Baterias', description: 'Nobreaks de alta performance inclusos para garantir energia constante.', icon: 'Battery', order_index: 3 },
            { title: 'Suporte Presencial', description: 'Equipe técnica disponível durante todo o evento para garantir estabilidade.', icon: 'Headset', order_index: 4 }
          ];
          const { error: insertError } = await supabase.from('services').insert(initialServices);
          if (insertError) console.error('Error seeding services to Supabase:', insertError.message, insertError.code, insertError.hint);
        }
      }
    } catch (err) {
      console.error('Seeding services error:', err);
    }
  };

async function startServer() {
  // Run seeding
  await seedUsers();
  await seedPlans();
  await seedServices();

  const app = express();
  
  // 1. Logging Middleware - MUST BE FIRST
  app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
  });

  // 2. Health & Diag - BEFORE anything else
  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
  
  app.get('/diag/routes', (req, res) => {
    const routes = app._router.stack
      .filter((r: any) => r.route)
      .map((r: any) => ({
        path: r.route.path,
        methods: r.route.methods
      }));
    res.json(routes);
  });

  // 3. Body Parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 4. API Routes
  const api = express.Router();

  // Add a dedicated logger for API requests
  api.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.url}`);
    next();
  });

  api.get('/ping', (req, res) => res.json({ message: 'pong' }));

  api.get('/qrcode', async (req, res) => {
    const { text } = req.query;
    console.log(`QR Code requested for: ${text}`);
    if (!text) return res.status(400).send('Text is required');
    try {
      const url = await QRCode.toDataURL(String(text), {
        color: { dark: '#00FF88', light: '#FFFFFF' },
        width: 400,
        margin: 2
      });
      res.json({ url });
    } catch (err) {
      console.error('QR Generation Error:', err);
      res.status(500).send('Failed to generate QR code');
    }
  });

  api.post('/auth/login', async (req, res) => {
    console.log('API: Login attempt', req.body.username);
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
      }

      let user;
      if (supabase) {
        console.log(`[LOGIN] checking Supabase for user: ${username}`);
        const { data, error } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
        if (error) {
          console.error('[LOGIN] Supabase error:', error.message);
        }
        user = data;
      }
      
      if (!user) {
        console.log(`[LOGIN] checking SQLite for user: ${username}`);
        user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      }
      
      if (!user) {
        console.log(`Login failed: user ${username} not found`);
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      if (!bcrypt.compareSync(password, user.password_hash)) {
        console.log(`Login failed: invalid password for ${username}`);
        return res.status(401).json({ message: 'Credenciais inválidas' });
      }

      if (!user.two_factor_enabled) {
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
        return res.json({ token, requires2FA: false });
      }

      res.json({ requires2FA: true, userId: user.id });
    } catch (error: any) {
      console.error('API Error: /auth/login', error);
      res.status(500).json({ message: `Erro interno: ${error.message}` });
    }
  });

  // Auth routes moved to API router for consistency
  api.post('/auth/verify-2fa', async (req, res) => {
    const { userId, code } = req.body;
    let user;
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      if (error) return res.status(500).json({ message: error.message });
      user = data;
    } else {
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }
    
    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });
    
    const { valid: isValid } = await verify({
      token: code,
      secret: user.two_factor_secret
    });

    if (!isValid) return res.status(401).json({ message: 'Código inválido' });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  });

  api.post('/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    console.log(`Solicitação de recuperação de senha para: ${email}`);
    
    let user;
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('username', email).maybeSingle();
      if (error) return res.status(500).json({ message: error.message });
      user = data;
    } else {
      user = db.prepare('SELECT * FROM users WHERE username = ?').get(email);
    }
    
    if (!user) {
      return res.json({ success: true, message: 'Se o e-mail estiver cadastrado, você receberá instruções de recuperação.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + 3600000;

    if (supabase) {
      await supabase.from('users').update({ reset_token: resetToken, reset_token_expiry: expiry }).eq('id', user.id);
    } else {
      db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?').run(resetToken, expiry, user.id);
    }

    const resetLink = `${req.headers.origin}/admin/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #00FF88;">Redefinição de Senha - InfraLink Eventos</h2>
        <p>Olá, <strong>${user.username}</strong>,</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no sistema InfraLink Eventos.</p>
        <p>Para prosseguir com a redefinição, clique no botão abaixo:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #00FF88; color: #000; padding: 15px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Redefinir Minha Senha</a>
        </div>
        <p style="color: #666; font-size: 14px;">Este link é válido por apenas 1 hora. Se você não solicitou esta alteração, pode ignorar este e-mail com segurança.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #999;">Esta é uma mensagem automática. Por favor, não responda.</p>
      </div>
    `;

    try {
      await sendEmail({
        to: email,
        subject: 'Recuperação de Senha - InfraLink Eventos',
        html: emailHtml
      });
      res.json({ success: true, message: 'Instruções de recuperação enviadas para o e-mail.' });
    } catch (err) {
      console.error('Error in forgot-password flow:', err);
      // Still return success to prevent email enumeration, or return error if SMTP failed and we want to let client know
      res.status(500).json({ message: 'Erro ao enviar e-mail de recuperação.' });
    }
  });

  api.post('/auth/reset-password', async (req, res) => {
    const { email, token, newPassword } = req.body;
    
    let user;
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('username', email).eq('reset_token', token).maybeSingle();
      if (error) return res.status(500).json({ message: error.message });
      user = data;
    } else {
      user = db.prepare('SELECT * FROM users WHERE username = ? AND reset_token = ?').get(email, token);
    }
    
    if (!user || user.reset_token_expiry < Date.now()) {
      return res.status(400).json({ message: 'Token de recuperação inválido ou expirado.' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    if (supabase) {
      await supabase.from('users').update({ password_hash: hash, reset_token: null, reset_token_expiry: null }).eq('id', user.id);
    } else {
      db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?').run(hash, user.id);
    }
    
    res.json({ success: true, message: 'Senha redefinida com sucesso.' });
  });

  api.get('/auth/setup-2fa', authenticate, async (req, res) => {
    const userId = (req as any).user.id;
    let user;
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      user = data;
    } else {
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }
    
    const secret = generateSecret();
    const otpauth = generateURI({
      issuer: 'InfraLink Eventos',
      label: user.username,
      secret
    });
    const qrCode = await QRCode.toDataURL(otpauth);

    if (supabase) {
      await supabase.from('users').update({ two_factor_secret: secret }).eq('id', userId);
    } else {
      db.prepare('UPDATE users SET two_factor_secret = ? WHERE id = ?').run(secret, userId);
    }
    res.json({ qrCode, secret });
  });

  api.post('/auth/enable-2fa', authenticate, async (req, res) => {
    const userId = (req as any).user.id;
    const { code } = req.body;
    
    let user;
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      user = data;
    } else {
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }
    
    const { valid: isValid } = await verify({
      token: code,
      secret: user.two_factor_secret
    });

    if (!isValid) return res.status(401).json({ message: 'Código inválido' });

    if (supabase) {
      await supabase.from('users').update({ two_factor_enabled: 1 }).eq('id', userId);
    } else {
      db.prepare('UPDATE users SET two_factor_enabled = 1 WHERE id = ?').run(userId);
    }
    res.json({ success: true });
  });

  api.post('/auth/disable-2fa', authenticate, async (req, res) => {
    const userId = (req as any).user.id;
    if (supabase) {
      await supabase.from('users').update({ two_factor_enabled: 0, two_factor_secret: null }).eq('id', userId);
    } else {
      db.prepare('UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?').run(userId);
    }
    res.json({ success: true });
  });

  api.get('/auth/me', authenticate, async (req, res) => {
    const userId = (req as any).user.id;
    let user;
    if (supabase) {
      const { data, error } = await supabase.from('users').select('id, username, two_factor_enabled').eq('id', userId).maybeSingle();
      user = data;
    } else {
      user = db.prepare('SELECT id, username, two_factor_enabled FROM users WHERE id = ?').get(userId);
    }
    res.json(user);
  });

  function authenticate(req: any, res: any, next: any) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  }

  // Content API (Moved to API router)
  api.get('/content', async (req, res) => {
    let content;
    if (supabase) {
      const { data, error } = await supabase.from('page_content').select('*');
      if (error) return res.status(500).json({ message: error.message });
      content = data;
    } else {
      content = db.prepare('SELECT * FROM page_content').all();
    }
    
    const formatted: any = {};
    if (content && Array.isArray(content)) {
      content.forEach((item: any) => {
        if (!formatted[item.section]) formatted[item.section] = {};
        formatted[item.section][item.key] = item.value;
      });
    }
    res.json(formatted);
  });

  api.post('/admin/content', authenticate, async (req, res) => {
    const { section, key, value } = req.body;
    if (supabase) {
      const { error } = await supabase
        .from('page_content')
        .upsert({ section, key, value }, { onConflict: 'section,key' });
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('INSERT OR REPLACE INTO page_content (section, key, value) VALUES (?, ?, ?)').run(section, key, value);
    }
    res.json({ success: true });
  });

  api.post('/admin/content/batch', authenticate, async (req, res) => {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ message: 'Updates must be an array' });
    
    if (supabase) {
      const { error } = await supabase.from('page_content').upsert(updates, { onConflict: 'section,key' });
      if (error) return res.status(500).json({ message: error.message });
    } else {
      const transaction = db.transaction((items) => {
        for (const item of items) {
          db.prepare('INSERT OR REPLACE INTO page_content (section, key, value) VALUES (?, ?, ?)').run(item.section, item.key, item.value);
        }
      });
      transaction(updates);
    }
    res.json({ success: true });
  });

  // Plans API (Moved to API router)
  api.get('/plans', async (req, res) => {
    try {
      let plans;
      if (supabase) {
        const { data, error } = await supabase.from('plans').select('*').order('order_index', { ascending: true });
        if (!error && data && data.length > 0) {
          console.log(`Fetched ${data.length} plans from Supabase`);
          plans = data;
        } else if (error) {
          console.error('Supabase plans error:', error.message);
        }
      }
      
      if (!plans) {
        plans = db.prepare('SELECT * FROM plans ORDER BY order_index ASC').all();
        console.log(`Fetched ${plans?.length || 0} plans from SQLite`);
      }
      
      res.json(plans || []);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
      res.status(500).json({ message: err.message });
    }
  });

  api.post('/plans/:id/click', async (req, res) => {
    try {
      const { id } = req.params;
      const dayOfWeek = new Date().getDay();
      if (supabase) {
        const { error } = await supabase.from('plan_clicks').insert({ plan_id: id, day_of_week: dayOfWeek });
        if (error) throw error;
      } else {
        db.prepare('INSERT INTO plan_clicks (plan_id, day_of_week) VALUES (?, ?)').run(id, dayOfWeek);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false });
    }
  });

  api.get('/admin/stats/plan-clicks', authenticate, async (req, res) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    let stats;
    
    if (supabase) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from('plan_clicks')
        .select('day_of_week')
        .gte('click_date', sevenDaysAgo.toISOString().split('T')[0]);
      
      if (error) return res.status(500).json({ message: error.message });
      
      const counts: any = {};
      data.forEach((row: any) => {
        counts[row.day_of_week] = (counts[row.day_of_week] || 0) + 1;
      });
      stats = Object.keys(counts).map(key => ({ day_of_week: parseInt(key), count: counts[key] }));
    } else {
      stats = db.prepare(`
        SELECT 
          day_of_week, 
          COUNT(*) as count 
        FROM plan_clicks 
        WHERE click_date >= DATE('now', '-7 days')
        GROUP BY day_of_week
      `).all();
    }

    const formattedStats = days.map((day, index) => {
      const stat = Array.isArray(stats) ? stats.find((s: any) => s.day_of_week === index) : null;
      return { day, clicks: stat ? stat.count : 0 };
    });

    res.json(formattedStats);
  });

  // Services API (Moved to API router)
  api.get('/services', async (req, res) => {
    try {
      let services;
      if (supabase) {
        const { data, error } = await supabase.from('services').select('*').order('order_index', { ascending: true });
        if (!error && data && data.length > 0) {
          services = data;
        } else if (error) {
          console.error('Supabase services error:', error.message);
        }
      }
      
      if (!services) {
        services = db.prepare('SELECT * FROM services ORDER BY order_index ASC').all();
      }
      
      res.json(services || []);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  api.post('/admin/services', authenticate, async (req, res) => {
    const { title, description, icon, order_index } = req.body;
    if (supabase) {
      const { error } = await supabase.from('services').insert({ title, description, icon: icon || 'Wifi', order_index: order_index || 0 });
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('INSERT INTO services (title, description, icon, order_index) VALUES (?, ?, ?, ?)').run(title, description, icon || 'Wifi', order_index || 0);
    }
    res.json({ success: true });
  });

  api.put('/admin/services/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { title, description, icon, order_index } = req.body;
    if (supabase) {
      const { error } = await supabase.from('services').update({ title, description, icon, order_index }).eq('id', id);
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('UPDATE services SET title = ?, description = ?, icon = ?, order_index = ? WHERE id = ?').run(title, description, icon, order_index, id);
    }
    res.json({ success: true });
  });

  api.delete('/admin/services/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('DELETE FROM services WHERE id = ?').run(id);
    }
    res.json({ success: true });
  });

  api.post('/admin/plans', authenticate, async (req, res) => {
    const { name, description, price, period, features, badge_text, highlight_color, is_featured, cta_text, cta_url, order_index, budget_text } = req.body;
    if (supabase) {
      const { error } = await supabase.from('plans').insert({ name, description, price, period, features, badge_text, highlight_color, is_featured: is_featured || 0, cta_text, cta_url, order_index: order_index || 0, budget_text });
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('INSERT INTO plans (name, description, price, period, features, badge_text, highlight_color, is_featured, cta_text, cta_url, order_index, budget_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, description, price, period, features, badge_text, highlight_color, is_featured || 0, cta_text, cta_url, order_index || 0, budget_text);
    }
    res.json({ success: true });
  });

  api.put('/admin/plans/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, period, features, badge_text, highlight_color, is_featured, cta_text, cta_url, order_index, budget_text } = req.body;
    if (supabase) {
      const { error } = await supabase.from('plans').update({ name, description, price, period, features, badge_text, highlight_color, is_featured: is_featured || 0, cta_text, cta_url, order_index, budget_text }).eq('id', id);
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('UPDATE plans SET name = ?, description = ?, price = ?, period = ?, features = ?, badge_text = ?, highlight_color = ?, is_featured = ?, cta_text = ?, cta_url = ?, order_index = ?, budget_text = ? WHERE id = ?').run(name, description, price, period, features, badge_text, highlight_color, is_featured || 0, cta_text, cta_url, order_index, budget_text, id);
    }
    res.json({ success: true });
  });

  api.delete('/admin/plans/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('DELETE FROM plans WHERE id = ?').run(id);
    }
    res.json({ success: true });
  });

  // Customers API (Moved to API router)
  api.get('/admin/customers', authenticate, async (req, res) => {
    if (supabase) {
      console.log('[CUSTOMER] Fetching customers from Supabase');
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('[CUSTOMER] Supabase fetch error:', error.message);
        return res.status(500).json({ message: error.message });
      }
      res.json(data);
    } else {
      const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
      res.json(customers);
    }
  });

  api.post('/admin/customers', authenticate, async (req, res) => {
    const { name, location, event_date, budget, cost, status, start_date, end_date, phone, email, plan_id } = req.body;
    console.log(`[CUSTOMER] Creating new customer: ${name} (${email})`);
    if (supabase) {
      const { error } = await supabase.from('customers').insert({ name, location, event_date, budget, cost: cost || 0, status: status || 'Pendente', start_date, end_date, phone, email, plan_id });
      if (error) {
        console.error('[CUSTOMER] Supabase insert error:', error.message, error.details, error.hint);
        return res.status(500).json({ message: error.message });
      }
    } else {
      db.prepare('INSERT INTO customers (name, location, event_date, budget, cost, status, start_date, end_date, phone, email, plan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, location, event_date, budget, cost || 0, status || 'Pendente', start_date, end_date, phone, email, plan_id);
    }
    res.json({ success: true });
  });

  api.put('/admin/customers/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { name, location, event_date, budget, cost, status, start_date, end_date, phone, email, plan_id } = req.body;
    if (supabase) {
      const { error } = await supabase.from('customers').update({ name, location, event_date, budget, cost: cost || 0, status, start_date, end_date, phone, email, plan_id }).eq('id', id);
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('UPDATE customers SET name = ?, location = ?, event_date = ?, budget = ?, cost = ?, status = ?, start_date = ?, end_date = ?, phone = ?, email = ?, plan_id = ? WHERE id = ?').run(name, location, event_date, budget, cost || 0, status, start_date, end_date, phone, email, plan_id, id);
    }
    res.json({ success: true });
  });

  api.delete('/admin/customers/:id', authenticate, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'ID inválido' });

    if (supabase) {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('DELETE FROM customers WHERE id = ?').run(id);
    }
    res.json({ success: true });
  });

  // Inventory API (Moved to API router)
  api.get('/admin/inventory', authenticate, async (req, res) => {
    if (supabase) {
      const { data, error } = await supabase.from('inventory').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ message: error.message });
      res.json(data);
    } else {
      const items = db.prepare('SELECT * FROM inventory ORDER BY created_at DESC').all();
      res.json(items);
    }
  });

  api.post('/admin/inventory', authenticate, async (req, res) => {
    const { name, brand, purchase_date, serial_number, supplier, price, status } = req.body;
    if (supabase) {
      const { error } = await supabase.from('inventory').insert({ name, brand, purchase_date, serial_number, supplier, price: price || 0, status: status || 'Ativo' });
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('INSERT INTO inventory (name, brand, purchase_date, serial_number, supplier, price, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, brand, purchase_date, serial_number, supplier, price || 0, status || 'Ativo');
    }
    res.json({ success: true });
  });

  api.put('/admin/inventory/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { name, brand, purchase_date, serial_number, supplier, price, status } = req.body;
    if (supabase) {
      const { error } = await supabase.from('inventory').update({ name, brand, purchase_date, serial_number, supplier, price: price || 0, status }).eq('id', id);
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('UPDATE inventory SET name = ?, brand = ?, purchase_date = ?, serial_number = ?, supplier = ?, price = ?, status = ? WHERE id = ?').run(name, brand, purchase_date, serial_number, supplier, price || 0, status, id);
    }
    res.json({ success: true });
  });

  api.delete('/admin/inventory/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
    }
    res.json({ success: true });
  });

  // Mount API router
  app.use('/api', api);

  // --- API Fallback ---
  app.all('/api/*', (req, res) => {
    console.log(`404 API Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found` });
  });

  // --- Vite / Frontend Serving ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  console.log('Registering routes...');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Routes registered and server is listening.');
  });
}

startServer();
