import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

const runMigration = async () => {
    try {
        console.log('🔄 Conectando ao banco para executar migração de privacidade de projetos...');
        const sqlPath = path.join(__dirname, 'add_project_privacy.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        await pool.query(sql);
        console.log('✅ Migração de privacidade de projetos executada com sucesso!');
    } catch (err) {
        console.error('❌ Erro na migração de privacidade de projetos:', err);
    } finally {
        await pool.end();
    }
};

runMigration();
