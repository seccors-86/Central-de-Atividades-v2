import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { requireAdmin } from '../middlewares/authMiddleware.js';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Garantir que a pasta de uploads exista
const uploadDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const allowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req: any, file: any, cb: any) => {
    if (allowedImageTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos.'));
    }
  }
});

// Configurações específicas para badges
const badgeUploadDir = path.join(__dirname, '../../uploads/badges');
if (!fs.existsSync(badgeUploadDir)) {
  fs.mkdirSync(badgeUploadDir, { recursive: true });
}

const uploadBadge = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: (req: any, file: any, cb: any) => {
    if (allowedImageTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos.'));
    }
  }
});

// Usar multer como middleware padrão do Express
const processImage = async (buffer: Buffer, destination: string, maxDimension: number) => {
  const image = sharp(buffer, { limitInputPixels: 40_000_000 });
  const metadata = await image.metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format || '')) throw new Error('Formato real não permitido.');
  const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
  await image.rotate().resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 }).toFile(path.join(destination, filename));
  return filename;
};

router.post('/avatar', upload.single('avatar'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    
    const filename = await processImage(req.file.buffer, uploadDir, 1024);
    const avatarUrl = `/api/avatars/${filename}`;
    // Retornar URL relativa ao backend - o frontend construirá a URL completa
    res.json({ url: avatarUrl, filename });
  } catch (error: any) {
    console.error('Erro no upload handler:', error);
    res.status(400).json({ error: 'Imagem inválida ou não suportada.' });
  }
});

// Rota de upload de imagem para badges
router.post('/badge', requireAdmin, uploadBadge.single('badge'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    
    // Sanitiza o nome do arquivo usando path.basename para evitar directory traversal
    const safeFilename = await processImage(req.file.buffer, badgeUploadDir, 2048);
    const badgeUrl = `/api/badges-static/${safeFilename}`;
    res.json({ url: badgeUrl, filename: safeFilename });
  } catch (error: any) {
    console.error('Erro no upload de badge:', error);
    res.status(400).json({ error: 'Imagem inválida ou não suportada.' });
  }
});

export default router;
