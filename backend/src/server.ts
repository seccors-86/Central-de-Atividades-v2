import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import pool from './config/database.js';
import { getAllowedOrigins } from './config/security.js';

// Import routes
import areasRoutes from './routes/areas.js';
import usersRoutes from './routes/users.js';
import clientsRoutes from './routes/clients.js';
import tagsRoutes from './routes/tags.js';
import statusesRoutes from './routes/statuses.js';
import activityLogsRoutes from './routes/activityLogs.js';
import tasksRoutes from './routes/tasks.js';
import aiSummariesRoutes from './routes/aiSummaries.js';
import authRoutes from './routes/auth.js';
import projectsRoutes from './routes/projects.js';
import supportRoutes from './routes/support.js';
import bucketsRoutes from './routes/buckets.js';
import projectPhasesRoutes from './routes/projectPhases.js';
import uploadRoutes from './routes/upload.js';
import gamificationRoutes from './routes/gamification.js';
import publicRoutes from './routes/public.js';
import commentsRoutes from './routes/comments.js';
import suggestionsRoutes from './routes/suggestions.js';
import notificationsRoutes from './routes/notifications.js';
import projectConfigRoutes from './routes/projectConfig.js';
import aiRoutes from './routes/ai.js';
import securityAuditRoutes from './routes/securityAudit.js';
import mfaRoutes from './routes/mfa.js';
import { authenticateToken } from './middlewares/authMiddleware.js';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { ensureSecurityAuditTable, recordSecurityEvent } from './security/audit.js';
import { provisionDemoUsers } from './config/demoUsers.js';
import { ensurePasswordRecoverySchema, ensureProjectKpiSchema } from './security/passwordRecovery.js';
import { ensureAIReportsSchema } from './security/aiReports.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = getAllowedOrigins();

// Middleware
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = Object.assign(new Error('Origem não autorizada pelo CORS.'), { status: 403 });
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' }
});
app.use('/api/auth', authLimiter);
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
app.use('/api', apiLimiter);

// Request logging middleware
app.use((req, res, next) => {
  res.setHeader('X-Request-ID', crypto.randomUUID());
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  res.on('finish', () => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.path.startsWith('/api/auth/')) {
      void recordSecurityEvent(req, 'api_mutation', res.statusCode);
    }
  });
  next();
});

// Serve static files for avatars
app.use('/api/avatars', express.static(path.join(__dirname, '../uploads/avatars')));

// Serve static files for badges
app.use('/api/badges-static', express.static(path.join(__dirname, '../uploads/badges')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'NUVYO API is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/comments', authenticateToken, commentsRoutes);
app.use('/api/suggestions', authenticateToken, suggestionsRoutes);
app.use('/api/notifications', authenticateToken, notificationsRoutes);
app.use('/api/project-config', authenticateToken, projectConfigRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/security-audit', authenticateToken, securityAuditRoutes);
app.use('/api/mfa', authenticateToken, mfaRoutes);

// Protected API Routes
app.use('/api/areas', authenticateToken, areasRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/clients', authenticateToken, clientsRoutes);
app.use('/api/tags', authenticateToken, tagsRoutes);
app.use('/api/statuses', authenticateToken, statusesRoutes);
app.use('/api/activity-logs', authenticateToken, activityLogsRoutes);
app.use('/api/tasks', authenticateToken, tasksRoutes);
app.use('/api/ai-summaries', authenticateToken, aiSummariesRoutes);
app.use('/api/projects', authenticateToken, projectsRoutes);
app.use('/api/support', authenticateToken, supportRoutes);
app.use('/api/buckets', authenticateToken, bucketsRoutes);
app.use('/api/project-phases', authenticateToken, projectPhasesRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/gamification', authenticateToken, gamificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  const status = Number(err.status) >= 400 && Number(err.status) < 500 ? Number(err.status) : 500;
  res.status(status).json({ error: status === 500 ? 'Erro interno do servidor.' : err.message });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ NULL");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret_encrypted TEXT NULL");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_recovery_hashes JSONB NOT NULL DEFAULT '[]'::jsonb");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled_at TIMESTAMPTZ NULL");
    await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_last_used_step BIGINT NOT NULL DEFAULT 0");
    await pool.query(`CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_by TEXT NULL REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await pool.query("INSERT INTO system_settings (key, value) VALUES ('mfa_required', 'false'::jsonb) ON CONFLICT (key) DO NOTHING");
    await ensureSecurityAuditTable();
    await ensureProjectKpiSchema();
    await ensurePasswordRecoverySchema();
    await ensureAIReportsSchema();
    await provisionDemoUsers();
    console.log('✅ Database connection successful');

    const adminCount = await pool.query("SELECT COUNT(*)::int AS total FROM users WHERE role = 'admin'");
    if (adminCount.rows[0].total === 0) {
      const login = process.env.BOOTSTRAP_ADMIN_LOGIN;
      const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
      if (!login || !/^\d{11,20}$/.test(login) || !password || password.length < 12) {
        throw new Error('Defina BOOTSTRAP_ADMIN_LOGIN com 11 a 20 dígitos e BOOTSTRAP_ADMIN_PASSWORD com no mínimo 12 caracteres.');
      }
      const passwordHash = await bcrypt.hash(password, 12);
      await pool.query(
        `INSERT INTO users (id, name, role, area_id, cpf, password_hash, avatar_url, pode_publicar)
         VALUES ('bootstrap-admin', 'Administrador', 'admin', 'area1', $1, $2, $3, true)`,
        [login, passwordHash, 'https://ui-avatars.com/api/?name=Administrador&background=0E1116&color=E6FAFC']
      );
      console.log('✅ Administrador inicial provisionado com segredos do ambiente.');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await pool.end();
  process.exit(0);
});

startServer();
