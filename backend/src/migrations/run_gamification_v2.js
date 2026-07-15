import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

const runMigration = async () => {
    try {
        console.log('🔄 Conectando ao banco para executar migração de gamificação V2...');
        const sqlPath = path.join(__dirname, 'update_gamification_v2.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await pool.query(sql);
        console.log('✅ Migração de gamificação V2 executada com sucesso!');
    } catch (err) {
        console.error('❌ Erro na migração de gamificação V2:', err);
    } finally {
        await pool.end();
    }
};

runMigration();
