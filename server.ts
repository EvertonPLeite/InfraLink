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
import dotenv from 'dotenv';

dotenv.config();

console.log('=== SERVER STARTUP ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 3000);
console.log('CWD:', process.cwd());
console.log('======================');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API Keys and Secrets
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'infralink-super-secret-key';

// Enhanced Supabase Config Detection
const getEnv = (key: string) => {
  const val = process.env[key];
  return val && val.trim() !== '' && !val.includes('...') ? val.trim() : undefined;
};

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('SUPABASE_PUBLISHABLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SECRET_KEY') || getEnv('SUPABASE_SERVICE_KEY');

console.log('--- SUPABASE ENVIRONMENT CHECK ---');
console.log('URL defined:', !!SUPABASE_URL);
console.log('Anon Key defined:', !!SUPABASE_KEY);
console.log('Service Role Key defined:', !!SUPABASE_SERVICE_ROLE_KEY);
console.log('---------------------------------');

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
  if (!url || !key || url.trim() === '' || key.trim() === '') {
    if (url || key) console.log('Supabase config partially defined but has empty values.');
    return false;
  }
  
  if (key.includes('...') || key.length < 20) {
    console.log(`Supabase key seems invalid (length: ${key.length}, contains dots: ${key.includes('...')})`);
    return false;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return true;
  } catch (e) {
    console.log(`Supabase URL is invalid: ${url}`);
    return false;
  }
};

async function initSupabase() {
  if (!isValidSupabaseConfig(SUPABASE_URL, SUPABASE_KEY)) {
    console.log('Supabase config missing or invalid. Falling back to SQLite.');
    return null;
  }

  try {
    const isProbablyValidSecret = (s: string | undefined) => s && s.length > 20 && !s.includes(' ') && !s.includes('...');
    let keyToUse = SUPABASE_KEY;
    let keyType = 'anon';

    if (isProbablyValidSecret(SUPABASE_SERVICE_ROLE_KEY)) {
      keyToUse = SUPABASE_SERVICE_ROLE_KEY!;
      keyType = 'service_role';
    }

    const client = createClient(SUPABASE_URL!, keyToUse!, {
      auth: { persistSession: false }
    });

    console.log(`Verifying Supabase connection using ${keyType} key...`);
    console.log(`Verifying Supabase connection for URL: ${SUPABASE_URL}`);
    console.log(`- Key source: ${keyType === 'service_role' ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_KEY'}`);
    console.log(`- Key length: ${keyToUse!.length}`);
    console.log(`- Key prefix: ${keyToUse!.substring(0, 5)}...`);
    
    // We try to fetch from 'plans' to verify the key. 
    // If the key is invalid, Supabase returns a 401/403.
    const { error } = await client.from('plans').select('id').limit(1);
    
    if (error) {
      const isKeyError = error.message.includes('Invalid API key') || error.code === 'PGRST301' || error.message.includes('JWT') || error.message.includes('apiKey');
      if (isKeyError) {
        console.error('***************************************************');
        console.error(`SUPABASE ERROR: ${error.message}`);
        console.error(`Attempted with ${keyType} key on URL: ${SUPABASE_URL}`);
        console.error('Please check your environment variables in Settings:');
        console.error('- NEXT_PUBLIC_SUPABASE_URL');
        console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY (starts with eyJ...)');
        console.error('- SUPABASE_SERVICE_ROLE_KEY (optional, starts with eyJ...)');
        console.error('***************************************************');
        
        // If we tried service_role and it failed, try anon as last resort for verification
        if (keyType === 'service_role') {
          console.log('Retrying verification with anon key...');
          const anonClient = createClient(SUPABASE_URL!, SUPABASE_KEY!, { auth: { persistSession: false } });
          const { error: anonError } = await anonClient.from('plans').select('id').limit(1);
          if (!anonError) {
            console.log('Verification succeeded with anon key but failed with service_role.');
            return anonClient;
          } else {
            console.error(`Verification also failed with anon key: ${anonError.message}`);
          }
        }
        return null;
      }
      
      // If the error is "relation does not exist" or similar, the key is likely VALID but the table is missing.
      // We return the client so the app stays in Supabase mode and can try to seed or report errors correctly.
      console.log(`Supabase verification returned non-auth error (likely missing table): ${error.message} (Code: ${error.code}). Key is likely valid.`);
      return client;
    }
    
    console.log(`Supabase connection verified successfully using ${keyType} key`);
    return client;
  } catch (err) {
    console.error('Failed to initialize Supabase:', err);
    return null;
  }
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
    title TEXT UNIQUE,
    description TEXT,
    icon TEXT,
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    event_name TEXT,
    location TEXT,
    event_date TEXT,
    budget DECIMAL(10,2),
    cost DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'Pendente',
    plan_id INTEGER,
    phone TEXT,
    email TEXT,
    start_date TEXT,
    end_date TEXT,
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
  
  // Cleanup duplicates in SQLite if they exist before adding UNIQUE index
  const duplicateServices = db.prepare('SELECT title, COUNT(*) as count FROM services GROUP BY title HAVING count > 1').all() as any[];
  if (duplicateServices.length > 0) {
    console.log(`Cleaning up ${duplicateServices.length} duplicate service titles in SQLite...`);
    duplicateServices.forEach(dup => {
      const firstId = db.prepare('SELECT id FROM services WHERE title = ? ORDER BY id ASC LIMIT 1').get(dup.title) as any;
      db.prepare('DELETE FROM services WHERE title = ? AND id != ?').run(dup.title, firstId.id);
    });
  }
  
  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_services_title ON services(title)`);
  } catch (err) {
    console.warn("Could not create unique index on services(title), might already be unique or have duplicates:", err);
  }

  const duplicatePlans = db.prepare('SELECT name, COUNT(*) as count FROM plans GROUP BY name HAVING count > 1').all() as any[];
  if (duplicatePlans.length > 0) {
    console.log(`Cleaning up ${duplicatePlans.length} duplicate plan names in SQLite...`);
    duplicatePlans.forEach(dup => {
      const firstId = db.prepare('SELECT id FROM plans WHERE name = ? ORDER BY id ASC LIMIT 1').get(dup.name) as any;
      db.prepare('DELETE FROM plans WHERE name = ? AND id != ?').run(dup.name, firstId.id);
    });
  }

  try {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_name ON plans(name)`);
  } catch (err) {
    console.warn("Could not create unique index on plans(name), might already be unique or have duplicates:", err);
  }

  // Customer table migrations
  try {
    const custColumns = db.prepare("PRAGMA table_info(customers)").all() as any[];
    const requiredCustColumns = [
      { name: 'event_name', type: 'TEXT' },
      { name: 'phone', type: 'TEXT' },
      { name: 'email', type: 'TEXT' },
      { name: 'start_date', type: 'TEXT' },
      { name: 'end_date', type: 'TEXT' }
    ];

    requiredCustColumns.forEach(reqCol => {
      if (!custColumns.some(col => col.name === reqCol.name)) {
        db.prepare(`ALTER TABLE customers ADD COLUMN ${reqCol.name} ${reqCol.type}`).run();
        console.log(`Added missing column ${reqCol.name} to customers table`);
      }
    });
  } catch (e) {
    console.error("Customers migration error:", e);
  }
} catch (e) {
  console.error("Database migration error:", e);
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
      try {
        const { data, error } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
        if (!error && !data) {
          console.log(`Seeding user ${username} into Supabase...`);
          const { error: insertError } = await supabase.from('users').insert({ username, password_hash: hash });
          if (insertError) console.error(`Error seeding user ${username} to Supabase:`, insertError.message);
        }
      } catch (err) {
        console.error(`Supabase seed exception for user ${username}:`, err);
      }
    }
  }
};

const seedContentData = [
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

const seedPageContent = async () => {
  // SQLite
  const insertContent = db.prepare('INSERT OR IGNORE INTO page_content (section, key, value) VALUES (?, ?, ?)');
  seedContentData.forEach(c => insertContent.run(c[0], c[1], c[2]));

  // Supabase
  if (supabase) {
    console.log('Checking page_content in Supabase...');
    try {
      const { data: existingContent, error: fetchError } = await supabase.from('page_content').select('id').limit(1);
      
      if (!fetchError && (!existingContent || existingContent.length === 0)) {
        console.log('Supabase page_content is empty. Seeding initial data...');
        const updates = seedContentData.map(c => ({ section: c[0], key: c[1], value: c[2] }));
        const { error } = await supabase.from('page_content').insert(updates);
        if (error) console.error('Supabase page_content sync error:', error.message);
      } else if (fetchError) {
        console.error('Error checking if page_content is empty in Supabase:', fetchError.message);
      }
    } catch (err) {
      console.error('Supabase page_content sync exception:', err);
    }
  }
};

  // Seed Initial Data
  const seedPlans = async () => {
    try {
      const initialPlans = [
        { name: 'Starter', description: 'Ideal para eventos pequenos com até 200 pessoas', price: 'R$ 890', period: 'por evento', features: 'Internet via satélite 50 Mbps,Até 3 pontos de acesso Wi-Fi,Suporte remoto durante evento,Relatório de uso pós-evento', badge_text: '', highlight_color: '#0066FF', is_featured: 0, cta_text: 'Contratar plano', cta_url: 'https://wa.me/5535988019507?text=Olá!%20Tenho%20interesse%20no%20Plano%20Starter%20para%20meu%20evento.', order_index: 0 },
        { name: 'Professional', description: 'Para eventos médios de 200 a 1.000 pessoas com infraestrutura robusta', price: 'R$ 1.990', period: 'por evento', features: 'Internet via satélite 150 Mbps,Até 10 pontos de acesso Wi-Fi,Gerenciamento de rede em tempo real,Estabilidade garantida para pagamentos,Banco de baterias incluso,Suporte presencial no evento', badge_text: '★ Mais Popular', highlight_color: '#00FF88', is_featured: 1, cta_text: 'Contratar plano', cta_url: 'https://wa.me/5535988019507?text=Olá!%20Tenho%20interesse%20no%20Plano%20Professional%20para%20meu%20evento.', order_index: 1 },
        { name: 'Enterprise', description: 'Solução completa para grandes eventos e festivais acima de 1.000 pessoas', price: 'Sob consulta', period: 'personalizado', features: 'Internet via satélite dedicada ilimitada,Pontos de acesso ilimitados,NOC dedicado 24/7,Redundância de link automática,Banco de baterias de alta capacidade,Equipe técnica presencial completa,SLA 99.9% de uptime garantido', badge_text: 'Premium', highlight_color: '#0066FF', is_featured: 0, cta_text: 'Solicitar proposta', cta_url: 'https://wa.me/5535988019507?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento%20para%20o%20Plano%20Enterprise.', order_index: 2 }
      ];

      // SQLite individual checks and updates for existing data
      for (const plan of initialPlans) {
        const existing = db.prepare('SELECT id, cta_url FROM plans WHERE name = ?').get(plan.name) as any;
        if (!existing) {
          db.prepare('INSERT INTO plans (name, description, price, period, features, badge_text, highlight_color, is_featured, cta_text, cta_url, order_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(plan.name, plan.description, plan.price, plan.period, plan.features, plan.badge_text, plan.highlight_color, plan.is_featured, plan.cta_text, plan.cta_url, plan.order_index);
        } else if (existing.cta_url === '#' || !existing.cta_url) {
          db.prepare('UPDATE plans SET cta_url = ? WHERE id = ?').run(plan.cta_url, existing.id);
        }
      }

      if (supabase) {
        console.log('Checking plans in Supabase...');

        const { data: existingSupabasePlans, error: checkError } = await supabase.from('plans').select('id, name, cta_url').order('id', { ascending: true });
        
        if (checkError) {
          console.error('Error checking plans in Supabase:', checkError.message);
          return;
        }

        if (!existingSupabasePlans || existingSupabasePlans.length === 0) {
          console.log('Supabase plans table is empty. Seeding initial plans...');
          const { error: insertError } = await supabase.from('plans').insert(initialPlans);
          if (insertError) console.error('Error seeding plans to Supabase:', insertError.message);
        } else {
          // Sync URLs if they are still defaults '#'
          for (const p of existingSupabasePlans) {
            if (p.cta_url === '#' || !p.cta_url) {
              const target = initialPlans.find(ip => ip.name === p.name);
              if (target) {
                await supabase.from('plans').update({ cta_url: target.cta_url }).eq('id', p.id);
                console.log(`Synced default URL for Supabase plan: ${p.name}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Seeding plans error:', err);
    }
  };

  const seedServices = async () => {
    try {
      const initialServices = [
        { title: 'Internet Dedicada', description: 'Link exclusivo para o seu evento, sem oscilações e com garantia de banda.', icon: 'Wifi', order_index: 0 },
        { title: 'Gerenciamento de Rede', description: 'Monitoramento em tempo real para garantir máxima segurança e performance.', icon: 'Activity', order_index: 1 },
        { title: 'Estabilidade para Pagamentos', description: 'Rede exclusiva para máquinas de cartão e caixas, evitando filas e perdas nas vendas.', icon: 'Zap', order_index: 2 },
        { title: 'Banco de Baterias', description: 'Nobreaks de alta performance inclusos para garantir energia constante.', icon: 'Battery', order_index: 3 },
        { title: 'Suporte Presencial', description: 'Equipe técnica disponível durante todo o evento para garantir estabilidade.', icon: 'Headset', order_index: 4 }
      ];

      // SQLite individual checks
      for (const service of initialServices) {
        const exists = db.prepare('SELECT id FROM services WHERE title = ?').get(service.title);
        if (!exists) {
          db.prepare('INSERT INTO services (title, description, icon, order_index) VALUES (?, ?, ?, ?)').run(service.title, service.description, service.icon, service.order_index);
        }
      }

      if (supabase) {
        console.log('Checking services in Supabase...');
        const { data: existingServices, error: checkError } = await supabase.from('services').select('id').limit(1);
        
        if (checkError) {
          console.error('Error checking services in Supabase:', checkError.message);
          return;
        }

        if (!existingServices || existingServices.length === 0) {
          console.log('Supabase services table is empty. Seeding initial services...');
          const { error: insertError } = await supabase.from('services').insert(initialServices);
          if (insertError) console.error('Error seeding services to Supabase:', insertError.message);
        }
      }
    } catch (err) {
      console.error('Seeding services error:', err);
    }
  };

const app = express();
const api = express.Router();

// 1. Body Parsers (CRITICAL: MUST BE BEFORE ROUTES)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. API Routes (MOUNTED EARLY to avoid conflicts)
app.use('/api', api);

async function startServer() {
  // 2. Logging Middleware
  app.use((req, res, next) => {
    const isViteRequest = req.url.startsWith('/@') || req.url.startsWith('/node_modules') || req.url.includes('?v=') || req.url.includes('?t=');
    const isSourceFile = req.url.match(/\.(tsx?|jsx?|css|html|json)$/);
    const isAsset = req.url.match(/\.(png|jpg|jpeg|gif|svg|woff2?|ttf|eot|ico)$/);

    if (isViteRequest || isSourceFile || isAsset) {
      return next();
    }

    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[REQ] ${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // 3. Health & Diag
  api.get('/debug', (req, res) => {
    res.json({
      status: 'ok',
      env: process.env.NODE_ENV,
      cwd: process.cwd(),
      time: new Date().toISOString(),
      supabase: !!supabase
    });
  });

  api.get('/healthz', (req, res) => res.json({ status: 'ok' }));

  // 4. API Routes
  // (Router defined earlier)

  // Add a dedicated logger for API requests
  api.use((req, res, next) => {
    console.log(`[API-EXACT] ${req.method} ${req.url}`);
    next();
  });

  api.get('/ping', (req, res) => res.json({ message: 'pong', timestamp: new Date().toISOString() }));

  api.get('/qrcode', async (req, res) => {
    const { text } = req.query;
    if (!text) return res.status(400).send('Text is required');
    
    try {
      // Use SVG by default as it's more reliable in server environments (doesn't require canvas)
      const svg = await QRCode.toString(String(text), {
        type: 'svg',
        color: { dark: '#00FF88', light: '#FFFFFF' },
        width: 400,
        margin: 2
      });
      const base64 = Buffer.from(svg).toString('base64');
      const url = `data:image/svg+xml;base64,${base64}`;
      res.json({ url });
    } catch (err: any) {
      console.error('[QR-GEN] SVG generation failed, trying DataURL:', err.message);
      try {
        const url = await QRCode.toDataURL(String(text), {
          color: { dark: '#00FF88', light: '#FFFFFF' },
          width: 400,
          margin: 2
        });
        res.json({ url });
      } catch (fallbackErr: any) {
        console.error('[QR-GEN] All generation methods failed:', fallbackErr.message);
        res.status(500).send(`Failed to generate QR code: ${err.message}`);
      }
    }
  });

  // Auth routes on API router
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
    try {
      let content;
      let source = 'SQLite';
      if (supabase) {
        const { data, error } = await supabase.from('page_content').select('*');
        if (!error && data) {
          content = data;
          source = 'Supabase';
        } else if (error) {
          console.warn('Supabase content fetch failed, falling back to SQLite:', error.message);
        }
      }
      
      if (!content) {
        content = db.prepare('SELECT * FROM page_content').all();
      }
      
      console.log(`[API] Returning content from ${source}`);
      const formatted: any = {};
      if (content && Array.isArray(content)) {
        content.forEach((item: any) => {
          if (!formatted[item.section]) formatted[item.section] = {};
          formatted[item.section][item.key] = item.value;
        });
      }
      res.json(formatted);
    } catch (err: any) {
      console.error('Content API error:', err);
      res.status(500).json({ message: err.message });
    }
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

  api.get('/plans', async (req, res) => {
    try {
      let plans;
      let source = 'SQLite';
      if (supabase) {
        const { data, error } = await supabase.from('plans').select('*').order('order_index', { ascending: true });
        if (!error && data && data.length > 0) {
          plans = data;
          source = 'Supabase';
        } else if (error) {
          console.warn('Supabase plans fetch failed, falling back to SQLite:', error.message);
        }
      }
      
      if (!plans) {
        plans = db.prepare('SELECT * FROM plans ORDER BY order_index ASC').all();
      }
      
      console.log(`[API] Returning ${plans.length} plans from ${source}`);
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

  api.get('/services', async (req, res) => {
    try {
      let services;
      let source = 'SQLite';
      if (supabase) {
        const { data, error } = await supabase.from('services').select('*').order('order_index', { ascending: true });
        if (!error && data && data.length > 0) {
          services = data;
          source = 'Supabase';
        } else if (error) {
          console.warn('Supabase services fetch failed, falling back to SQLite:', error.message);
        }
      }
      
      if (!services) {
        services = db.prepare('SELECT * FROM services ORDER BY order_index ASC').all();
      }
      
      console.log(`[API] Returning ${services.length} services from ${source}`);
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
      // Use a safe select first to avoid schema cache issues with newly added columns
      const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
      
      if (error) {
        console.error('[CUSTOMER] Supabase fetch error:', error.message);
        
        // Self-healing: if column not found in cache or other schema error
        if (error.message.toLowerCase().includes('column') || error.message.toLowerCase().includes('schema') || error.message.toLowerCase().includes('cache')) {
          console.warn('[CUSTOMER] Fetching only basic columns due to schema error...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('customers')
            .select('id, name, location, event_date, budget, cost, status, plan_id, created_at, phone, email')
            .order('created_at', { ascending: false });
            
          if (fallbackError) {
             console.warn('[CUSTOMER] Fallback fetch failed, trying minimal...');
             const { data: minimalData, error: minimalError } = await supabase
              .from('customers')
              .select('id, name, location, event_date, budget, cost, status, plan_id, created_at')
              .order('created_at', { ascending: false });
             if (minimalError) return res.status(500).json({ message: minimalError.message });
             return res.json(minimalData);
          }
          return res.json(fallbackData);
        }
        
        return res.status(500).json({ message: error.message });
      }
      res.json(data);
    } else {
      const customers = db.prepare('SELECT * FROM customers ORDER BY created_at DESC').all();
      res.json(customers);
    }
  });

  api.get('/admin/customers/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    if (supabase) {
      const { data, error } = await supabase.from('customers').select('*').eq('id', id).maybeSingle();
      if (error) {
        // Fallback for single record fetch
        if (error.message.toLowerCase().includes('column') || error.message.toLowerCase().includes('schema') || error.message.toLowerCase().includes('cache')) {
           const { data: fallbackData, error: fallbackError } = await supabase
            .from('customers')
            .select('id, name, location, event_date, budget, cost, status, plan_id, created_at, phone, email')
            .eq('id', id)
            .maybeSingle();
           if (fallbackError) return res.status(500).json({ message: fallbackError.message });
           return res.json(fallbackData);
        }
        return res.status(500).json({ message: error.message });
      }
      res.json(data);
    } else {
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
      res.json(customer || null);
    }
  });

  api.post('/admin/customers', authenticate, async (req, res) => {
    let { name, event_name, location, event_date, budget, cost, status, start_date, end_date, phone, email, plan_id } = req.body;
    
    // Sanitize numeric fields
    const numericBudget = parseFloat(budget) || 0;
    const numericCost = parseFloat(cost) || 0;
    const numericPlanId = plan_id ? parseInt(plan_id) : null;

    console.log(`[CUSTOMER] Creating new customer: ${name} / Event: ${event_name} (${email})`);
    if (supabase) {
      const payload = { 
        name, event_name, location, event_date, 
        budget: numericBudget, 
        cost: numericCost, 
        status: status || 'Pendente', 
        start_date, end_date, phone, email, 
        plan_id: numericPlanId 
      };

      const { error } = await supabase.from('customers').insert(payload);
      
      if (error) {
        console.error('[CUSTOMER] Supabase insert error:', error.message);
        
        // Self-healing: if column not found, try without event_name and other new columns
        if (error.message.toLowerCase().includes('column') || error.message.toLowerCase().includes('schema') || error.message.toLowerCase().includes('cache')) {
          console.warn('[CUSTOMER] Attempting fallback insert due to schema error...');
          const fallbackPayload = { 
            name, location, event_date, 
            budget: numericBudget, 
            cost: numericCost, 
            status: status || 'Pendente', 
            plan_id: numericPlanId 
          };
          const { error: fallbackError } = await supabase.from('customers').insert(fallbackPayload);
          if (fallbackError) return res.status(500).json({ message: `Fallback failed: ${fallbackError.message}. Please add missing columns to Supabase table 'customers' (event_name, phone, email, start_date, end_date) and refresh schema cache.` });
          return res.json({ success: true, warning: 'Saved without some fields due to schema mismatch.' });
        }
        
        return res.status(500).json({ message: error.message });
      }
    } else {
      db.prepare('INSERT INTO customers (name, event_name, location, event_date, budget, cost, status, start_date, end_date, phone, email, plan_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        name, event_name, location, event_date, numericBudget, numericCost, status || 'Pendente', start_date, end_date, phone, email, numericPlanId
      );
    }
    res.json({ success: true });
  });

  api.put('/admin/customers/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    let { name, event_name, location, event_date, budget, cost, status, start_date, end_date, phone, email, plan_id } = req.body;
    
    // Sanitize numeric fields
    const numericBudget = parseFloat(budget) || 0;
    const numericCost = parseFloat(cost) || 0;
    const numericPlanId = plan_id ? parseInt(plan_id) : null;

    if (supabase) {
      const payload = { 
        name, event_name, location, event_date, 
        budget: numericBudget, 
        cost: numericCost, 
        status, start_date, end_date, phone, email, 
        plan_id: numericPlanId 
      };

      const { error } = await supabase.from('customers').update(payload).eq('id', id);
      
      if (error) {
        console.error('[CUSTOMER] Supabase update error:', error.message);
        
        // Self-healing fallback for missing columns
        if (error.message.toLowerCase().includes('column') || error.message.toLowerCase().includes('schema') || error.message.toLowerCase().includes('cache')) {
          console.warn('[CUSTOMER] Attempting fallback update due to schema error...');
          const fallbackPayload = { 
            name, location, event_date, 
            budget: numericBudget, 
            cost: numericCost, 
            status, 
            plan_id: numericPlanId 
          };
          const { error: fallbackError } = await supabase.from('customers').update(fallbackPayload).eq('id', id);
          if (fallbackError) return res.status(500).json({ message: `Fallback failed: ${fallbackError.message}. Please add missing columns to Supabase table 'customers' (event_name, phone, email, start_date, end_date) and refresh schema cache.` });
          return res.json({ success: true, warning: 'Updated without some fields due to schema mismatch.' });
        }
        
        return res.status(500).json({ message: error.message });
      }
    } else {
      db.prepare('UPDATE customers SET name = ?, event_name = ?, location = ?, event_date = ?, budget = ?, cost = ?, status = ?, start_date = ?, end_date = ?, phone = ?, email = ?, plan_id = ? WHERE id = ?').run(
        name, event_name, location, event_date, numericBudget, numericCost, status, start_date, end_date, phone, email, numericPlanId, id
      );
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
    const numericPrice = parseFloat(price) || 0;
    if (supabase) {
      const { error } = await supabase.from('inventory').insert({ name, brand, purchase_date, serial_number, supplier, price: numericPrice, status: status || 'Ativo' });
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('INSERT INTO inventory (name, brand, purchase_date, serial_number, supplier, price, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(name, brand, purchase_date, serial_number, supplier, numericPrice, status || 'Ativo');
    }
    res.json({ success: true });
  });

  api.put('/admin/inventory/:id', authenticate, async (req, res) => {
    const { id } = req.params;
    const { name, brand, purchase_date, serial_number, supplier, price, status } = req.body;
    const numericPrice = parseFloat(price) || 0;
    if (supabase) {
      const { error } = await supabase.from('inventory').update({ name, brand, purchase_date, serial_number, supplier, price: numericPrice, status }).eq('id', id);
      if (error) return res.status(500).json({ message: error.message });
    } else {
      db.prepare('UPDATE inventory SET name = ?, brand = ?, purchase_date = ?, serial_number = ?, supplier = ?, price = ?, status = ? WHERE id = ?').run(name, brand, purchase_date, serial_number, supplier, numericPrice, status, id);
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

  // --- API Fallback ---
  api.all('/*', (req, res) => {
    console.log(`[API-404] Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ message: `Route ${req.method} ${req.url} not found on API router` });
  });

  // --- Global API Fallback (Catch-all for /api that missed the router) ---
  app.all('/api/*', (req, res) => {
    console.log(`[GLOBAL-404] API Not Found: ${req.method} ${req.url}`);
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

  const initLogic = async () => {
    // Initialize Supabase in the background
    try {
      const client = await initSupabase();
      supabase = client;
      console.log('Supabase background initialization finished.');
    } catch (err) {
      console.error('Supabase background initialization failed:', err);
    }
    
    // Seed data
    seedUsers();
    seedPageContent();
    seedPlans();
    seedServices();
  };

  if (process.env.VERCEL === '1' || !!process.env.VERCEL) {
    console.log('Vercel environment detected. Skipping listen but initializing background tasks.');
    initLogic();
    return;
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Routes registered and server is listening.');
    initLogic();
  });
}

startServer().catch(err => {
  console.error('FATAL: Failed to start server:', err);
  process.exit(1);
});

export default app;
