
import Database from 'better-sqlite3';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// CHAVE QUE VOCÊ ENVIOU
const KEY_FROM_CHAT = "sb_publishable_y5A6ChvMVANFhSyUK__8Cw_DqM2GDOX";

if (!SUPABASE_URL) {
    console.error("Erro: SUPABASE_URL não encontrada no ambiente.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, KEY_FROM_CHAT);
const db = new Database('database.sqlite');

async function migrate() {
    console.log("Tentando migração com a chave fornecida...");
    console.log("URL:", SUPABASE_URL);

    const tables = ['plans', 'services', 'page_content', 'users'];
    
    for (const table of tables) {
        try {
            const data = db.prepare(`SELECT * FROM ${table}`).all();
            if (data.length > 0) {
                console.log(`Enviando ${data.length} registros para ${table}...`);
                const { error } = await supabase.from(table).upsert(data);
                if (error) {
                    console.error(`Erro na tabela ${table}:`, error.message);
                } else {
                    console.log(`Tabela ${table} migrada com sucesso!`);
                }
            }
        } catch (e: any) {
            console.error(`Erro ao ler tabela ${table}:`, e.message);
        }
    }
}

migrate();
